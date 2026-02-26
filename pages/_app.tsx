import "katex/dist/katex.css"; 
import type { AppProps } from "next/app";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { Prose, withProse } from "@nikolovlazar/chakra-ui-prose";
import Layout from "../components/Layout";
import { ReactElement, ReactNode } from "react";
import { DefaultSeo } from "next-seo";
import React from "react";
import { useRouter } from "next/router";
import { Lora } from "next/font/google";
import { NextPage } from "next";

// define a custom layout type
export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode
}

// extend appprops to include the custom layout type
interface AppPropsWithLayout extends AppProps {
  Component: NextPageWithLayout;
}

const lora = Lora({ subsets: ["latin"], display: "swap" });

const theme = extendTheme(
  {
    config: {
      initialColorMode: "system",
      useSystemColorMode: true,
    },
    fonts: {
      heading: lora.style.fontFamily,
      body: lora.style.fontFamily,
    },
    semanticTokens: {
      colors: {
        "bg.canvas": {
          default: "#fbf5e8",
          _dark: "#0f1115",
        },
        "bg.surface": {
          default: "#fffaf0",
          _dark: "#171b24",
        },
        "text.primary": {
          default: "#2b241c",
          _dark: "#e8edf5",
        },
        "text.muted": {
          default: "#8a7863",
          _dark: "#b6c3d6",
        },
        "border.subtle": {
          default: "#d6c7b2",
          _dark: "#2e3647",
        },
        "accent.link": {
          default: "#365f3a",
          _dark: "#d8a56a",
        },
        "accent.linkHover": {
          default: "#2c4f30",
          _dark: "#e6bd8b",
        },
      },
    },
    styles: {
      global: {
        body: {
          bg: "bg.canvas",
          color: "text.primary",
        },
      },
    },
    components: {
      Heading: {
        baseStyle: {
          fontWeight: "600",
          letterSpacing: "-0.02em",
        },
      },
      Link: {
        baseStyle: {
          color: "accent.link",
          _hover: {
            textDecoration: "underline",
            color: "accent.linkHover",
          },
        },
      },
      Divider: {
        baseStyle: {
          borderColor: "border.subtle",
        },
      },
      Input: {
        variants: {
          outline: {
            field: {
              borderColor: "border.subtle",
              _hover: { borderColor: "text.muted" },
              _focusVisible: { borderColor: "accent.link", boxShadow: "0 0 0 1px var(--chakra-colors-accent-link)" },
            },
          },
        },
      },
      Button: {
        variants: {
          outline: {
            borderColor: "border.subtle",
            color: "text.primary",
            _hover: { bg: "bg.surface" },
          },
          solid: {
            bg: "accent.link",
            color: "white",
            _hover: { bg: "accent.linkHover" },
          },
        },
      },
      Menu: {
        baseStyle: {
          list: {
            bg: "bg.surface",
            borderColor: "border.subtle",
          },
          item: {
            bg: "bg.surface",
            _hover: { bg: "bg.canvas" },
          },
        },
      },
    },
  },
  withProse({
    baseStyle: {
      "h1, h2, h3, h4, h5, h6": {
        mt: 4,
        mb: 4,
      },
      p: {
        my: 3,
      },
      a: {
        color: "accent.link",
      },
      // // Exclude rehype-katex classes
      // ".language-math, .language-math-inline": {
      //   fontFamily: "KaTeX_Main, Times New Roman, serif",
      //   fontSize: "1em",
      // },
    },
  })
);

const getDefaultLayout = (page: ReactElement) => (
  <Layout>
    <Prose>{page}</Prose>
  </Layout>
);

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  const router = useRouter();
  const getLayout = Component.getLayout || getDefaultLayout;

  return (
    <ChakraProvider theme={theme}>
      <DefaultSeo
        title="Ilir Gusija"
        description=""
        openGraph={{
          title: "Ilir Gusija",
          description:
            "",
          images: [
            {
              url: "https://ilirgusija.com/ilir.jpg",
              type: "image/jpeg",
            },
          ],
          siteName: "Ilir Gusija",
        }}
      />
      {getLayout(<Component {...pageProps} />)}
    </ChakraProvider>
  );
}
