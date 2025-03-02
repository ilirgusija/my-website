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
    fonts: {
      heading: lora.style.fontFamily,
      body: lora.style.fontFamily,
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
        color: "blue.500",
      },
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
