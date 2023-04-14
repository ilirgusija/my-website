import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className="flex min-h-screen">
      <Nav />
      <div className="flex-1 flex flex-col">
          <Component {...pageProps} />
        
        <Footer />
      </div>
    </div>
  );
}
