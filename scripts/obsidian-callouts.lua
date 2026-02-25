-- Pandoc Lua filter: Convert Obsidian callout blockquotes to styled divs
--
-- Obsidian callouts look like:
--   > [!type] Optional Title
--   > Content here...
--
-- This filter converts them to:
--   <div class="callout callout-{type}" ...>Content</div>

local callout_type_map = {
  def = "definition", definition = "definition",
  thm = "theorem", theorem = "theorem",
  proof = "proof", example = "example",
  note = "note", warning = "warning",
  tip = "tip", important = "important",
  lem = "lemma", lemma = "lemma", corollary = "corollary",
  proposition = "proposition", remark = "remark", claim = "claim",
  prp = "proposition", rmk = "remark",
  axiom = "axiom", assumption = "assumption",
  exercise = "exercise", conjecture = "conjecture",
  hypothesis = "hypothesis", solution = "solution",
}

local callout_labels = {
  definition = "Definition",
  theorem = "Theorem",
  proof = "Proof",
  example = "Example",
  lemma = "Lemma",
  corollary = "Corollary",
  proposition = "Proposition",
  remark = "Remark",
  claim = "Claim",
  axiom = "Axiom",
  assumption = "Assumption",
  exercise = "Exercise",
  conjecture = "Conjecture",
  hypothesis = "Hypothesis",
  note = "Note",
  warning = "Warning",
  tip = "Tip",
  important = "Important",
  solution = "Solution",
}

-- Extract plain text from inlines (for title attribute)
local function inlines_to_text(inlines)
  local parts = {}
  for _, inl in ipairs(inlines) do
    if inl.t == "Str" then
      table.insert(parts, inl.text)
    elseif inl.t == "Space" then
      table.insert(parts, " ")
    elseif inl.t == "SoftBreak" then
      table.insert(parts, " ")
    elseif inl.t == "Math" then
      table.insert(parts, inl.text)
    end
  end
  return table.concat(parts)
end

function BlockQuote(el)
  if #el.content == 0 then return nil end

  local first_block = el.content[1]
  if first_block.t ~= "Para" and first_block.t ~= "Plain" then
    return nil
  end

  local inlines = first_block.content
  if #inlines == 0 then return nil end

  -- Check for [!type] or [!type|label] marker
  local first = inlines[1]
  if first.t ~= "Str" then return nil end

  local raw_type, pipe_label
  -- Match [!type] or [!type|label]
  raw_type = first.text:match("^%[!(%w+)%]$")
  if not raw_type then
    raw_type = first.text:match("^%[!(%w+)|")
    if raw_type then
      pipe_label = first.text:match("|(.+)%]$")
      if not pipe_label then
        -- Label may continue in subsequent inlines
        local label_parts = { first.text:match("|(.*)$") or "" }
        for i = 2, #inlines do
          if inlines[i].t == "Str" then
            local before_close = inlines[i].text:match("^(.-)%]")
            if before_close then
              table.insert(label_parts, before_close)
              break
            else
              table.insert(label_parts, inlines[i].text)
            end
          elseif inlines[i].t == "Space" then
            table.insert(label_parts, " ")
          end
        end
        pipe_label = table.concat(label_parts)
      end
    else
      return nil  -- Not a callout
    end
  end

  local callout_type = callout_type_map[raw_type:lower()] or raw_type:lower()
  local label = callout_labels[callout_type] or (callout_type:sub(1,1):upper() .. callout_type:sub(2))

  -- Split the first paragraph at the first SoftBreak:
  --   Before SoftBreak = title (after the [!type] marker)
  --   After SoftBreak = first body paragraph content
  local title_inlines = {}
  local body_inlines = {}
  local found_softbreak = false
  local past_marker = false

  for i, inl in ipairs(inlines) do
    if i == 1 then
      -- Skip the [!type] marker itself
      past_marker = true
    elseif not past_marker then
      -- Still in marker area (for multi-part markers like [!type|label])
      if inl.t == "Str" and inl.text:match("%]") then
        past_marker = true
        local after = inl.text:match("%](.+)")
        if after then
          table.insert(title_inlines, pandoc.Str(after))
        end
      end
    elseif not found_softbreak then
      if inl.t == "SoftBreak" then
        found_softbreak = true
      else
        table.insert(title_inlines, inl)
      end
    else
      table.insert(body_inlines, inl)
    end
  end

  -- Remove leading/trailing spaces from title
  while #title_inlines > 0 and title_inlines[1].t == "Space" do
    table.remove(title_inlines, 1)
  end
  while #title_inlines > 0 and title_inlines[#title_inlines].t == "Space" do
    table.remove(title_inlines, #title_inlines)
  end

  local title_text = inlines_to_text(title_inlines)

  -- Build display title
  local display_title
  if pipe_label and pipe_label ~= "" then
    display_title = label .. " (" .. pipe_label .. ")"
  elseif title_text ~= "" then
    display_title = label .. " (" .. title_text .. ")"
  else
    display_title = label
  end

  -- Build body blocks
  local body_blocks = {}

  -- If we found body inlines from the first paragraph (after SoftBreak),
  -- create a new Para for them
  if #body_inlines > 0 then
    table.insert(body_blocks, pandoc.Para(body_inlines))
  elseif not found_softbreak and #title_inlines == 0 then
    -- No SoftBreak and no title: entire first para was just [!type]
    -- Body is in subsequent blocks only
  elseif not found_softbreak then
    -- No SoftBreak: everything after marker is the body (single-line callout)
    -- title_inlines actually IS the body content
    table.insert(body_blocks, pandoc.Para(title_inlines))
    title_text = ""
    -- Recalculate display title
    if pipe_label and pipe_label ~= "" then
      display_title = label .. " (" .. pipe_label .. ")"
    else
      display_title = label
    end
  end

  -- Add remaining blocks from the blockquote
  for i = 2, #el.content do
    table.insert(body_blocks, el.content[i])
  end

  -- Extract block reference ID (^hexid) from body for callout anchoring
  local block_ref_id = nil
  for i = #body_blocks, 1, -1 do
    local block = body_blocks[i]
    if block.t == "Para" or block.t == "Plain" then
      local inlines = block.content
      if #inlines > 0 then
        local last = inlines[#inlines]
        if last.t == "Str" and last.text:match("^%^[a-f0-9]+$") then
          block_ref_id = last.text  -- includes the ^
          table.remove(inlines, #inlines)
          -- Remove trailing space/softbreak
          while #inlines > 0 and (inlines[#inlines].t == "Space" or inlines[#inlines].t == "SoftBreak") do
            table.remove(inlines, #inlines)
          end
          if #inlines == 0 then
            table.remove(body_blocks, i)
          end
          break
        end
      end
    end
  end

  -- Create a Div with callout classes, optional id from block ref
  local attr_id = block_ref_id or ""
  return pandoc.Div(body_blocks, pandoc.Attr(attr_id, {"callout", "callout-" .. callout_type}, {
    ["data-callout-type"] = callout_type,
    ["data-callout-title"] = display_title
  }))
end
