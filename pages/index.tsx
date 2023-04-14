import Head from 'next/head';
import Image from 'next/image';
import ilir from '../public/ilir.jpg';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full py-2 bg-gray-100">
      <Head>
        <title>Ilir&apos;s Portfolio</title>
        <meta name="description" content="Ilir's personal portfolio website" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <div className="w-full flex justify-center">
          <div className="flex items-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-800 animate-fade-in-down">Hi, I&apos;m Ilir</h1>
          </div>
        </div>

        <div className="relative w-48 h-48 mt-8">
          <Image src={ilir} alt="Ilir" fill style={{ objectFit: 'contain' }} className="rounded-full animate-fade-in-up" />
        </div>

        <p className="text-lg md:text-2xl text-gray-700 mt-8 animate-fade-in">
          Welcome to my personal portfolio website. I&apos;m a computer engineer, proud Gooner, and fitness fanatic. Please take a look around my website!
        </p>
      </main>
    </div>
  );
}
