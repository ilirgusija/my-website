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

local function markdown_to_inlines(text)
  if not text or text == "" then return {} end
  local ok, parsed = pcall(pandoc.read, text, "markdown")
  if not ok or not parsed or #parsed.blocks == 0 then
    return { pandoc.Str(text) }
  end
  local first = parsed.blocks[1]
  if first.t == "Para" or first.t == "Plain" then
    return first.content
  end
  return { pandoc.Str(text) }
end

local function inlines_to_markdown(inlines)
  local parts = {}
  for _, inl in ipairs(inlines) do
    if inl.t == "Str" then
      table.insert(parts, inl.text)
    elseif inl.t == "Space" or inl.t == "SoftBreak" then
      table.insert(parts, " ")
    elseif inl.t == "Math" then
      table.insert(parts, "$" .. inl.text .. "$")
    elseif inl.t == "Code" then
      table.insert(parts, "`" .. inl.text .. "`")
    elseif inl.t == "Emph" then
      table.insert(parts, "*" .. inlines_to_markdown(inl.content) .. "*")
    elseif inl.t == "Strong" then
      table.insert(parts, "**" .. inlines_to_markdown(inl.content) .. "**")
    elseif inl.t == "Link" then
      local label = inlines_to_markdown(inl.content)
      local target = inl.target or ""
      table.insert(parts, "[" .. label .. "](" .. target .. ")")
    else
      local txt = pandoc.utils.stringify(inl)
      if txt and txt ~= "" then
        table.insert(parts, txt)
      end
    end
  end
  return table.concat(parts)
end

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

  local raw_type
  local marker_end_idx = 1
  local pipe_title_inlines = {}
  local has_pipe_label = false

  -- Match [!type]
  raw_type = first.text:match("^%[!(%w+)%]$")

  -- Match [!type|...]
  if not raw_type then
    raw_type = first.text:match("^%[!(%w+)|")
    if raw_type then
      has_pipe_label = true
      local remainder = first.text:match("^%[!%w+|(.*)$") or ""
      local marker_closed = false

      -- Keep inline formatting in pipe labels (including links/math),
      -- instead of flattening to plain text.
      if remainder ~= "" then
        local before_close = remainder:match("^(.-)%]$")
        if before_close then
          if before_close ~= "" then
            table.insert(pipe_title_inlines, pandoc.Str(before_close))
          end
          marker_closed = true
          marker_end_idx = 1
        else
          table.insert(pipe_title_inlines, pandoc.Str(remainder))
        end
      end

      if not marker_closed then
        for i = 2, #inlines do
          local inl = inlines[i]
          if inl.t == "Str" then
            local before_close = inl.text:match("^(.-)%]$")
            if before_close then
              if before_close ~= "" then
                table.insert(pipe_title_inlines, pandoc.Str(before_close))
              end
              marker_closed = true
              marker_end_idx = i
              break
            else
              table.insert(pipe_title_inlines, inl)
            end
          else
            table.insert(pipe_title_inlines, inl)
          end
        end
      end

      if not marker_closed then
        return nil -- malformed marker
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
  for i = marker_end_idx + 1, #inlines do
    local inl = inlines[i]
    if not found_softbreak then
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
  while #pipe_title_inlines > 0 and pipe_title_inlines[1].t == "Space" do
    table.remove(pipe_title_inlines, 1)
  end
  while #pipe_title_inlines > 0 and pipe_title_inlines[#pipe_title_inlines].t == "Space" do
    table.remove(pipe_title_inlines, #pipe_title_inlines)
  end

  local title_text = inlines_to_text(title_inlines)

  -- Build display title as real inlines so math / links render correctly.
  local title_display_inlines = { pandoc.Str(label) }
  local explicit_title_inlines = {}
  if has_pipe_label and #pipe_title_inlines > 0 then
    -- Pipe label text lives inside the callout marker and often arrives as raw
    -- inlines; re-parse as markdown so links/math render in the final title.
    explicit_title_inlines = markdown_to_inlines(inlines_to_markdown(pipe_title_inlines))
  elseif #title_inlines > 0 then
    explicit_title_inlines = title_inlines
  end
  if #explicit_title_inlines > 0 then
    table.insert(title_display_inlines, pandoc.Space())
    table.insert(title_display_inlines, pandoc.Str("("))
    for _, inl in ipairs(explicit_title_inlines) do
      table.insert(title_display_inlines, inl)
    end
    table.insert(title_display_inlines, pandoc.Str(")"))
  end

  -- Build body blocks
  local body_blocks = {}

  -- If we found body inlines from the first paragraph (after SoftBreak),
  -- create a new Para for them
  if #body_inlines > 0 then
    table.insert(body_blocks, pandoc.Para(body_inlines))
  elseif not found_softbreak and #title_inlines == 0 then
    -- No SoftBreak and no title: entire first para was just [!type].
    -- Body is in subsequent blocks only.
  end

  -- Add remaining blocks from the blockquote
  for i = 2, #el.content do
    table.insert(body_blocks, el.content[i])
  end

  -- Always prepend an explicit title line block. This allows full markdown/LaTeX
  -- rendering in titles instead of relying on CSS pseudo-content text.
  table.insert(body_blocks, 1, pandoc.Para({
    pandoc.Span(title_display_inlines, pandoc.Attr("", {"callout-title"}))
  }))

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
    ["data-callout-title"] = inlines_to_text(title_display_inlines)
  }))
end
