import Head from 'next/head'
import Image from 'next/image'
import ilir from '../public/ilir.jpg'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-screen py-2">
      <Head>
        <title>Ilir&apos;s Portfolio</title>
        <meta name="description" content="Ilir's personal portfolio website" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <div className="w-full flex justify-center">
          <div className="flex items-center">
            <span className="text-6xl font-bold text-gray-800">Hi, I&apos;m Ilir</span>
          </div>
        </div>

        <div className="relative w-48 h-48 mt-8">
          <Image src={ilir} alt="Ilir" fill style={{objectFit:"contain"}} />
        </div>

        <p className="text-lg md:text-2xl text-gray-700 mt-8">
          Welcome to my personal portfolio website. I&apos;m a computer engineer, proud Gooner, and fitness fanatic. Please take a look around my website!
        </p>

        {/* <div className="flex items-center justify-center w-full mt-8">
          <a href="#" className="px-6 py-3 bg-gray-800 text-green-500 font-bold rounded-lg hover:bg-gray-700 transition-colors duration-300">
            View My Work
          </a>
        </div> */}
      </main>

      <footer className="flex items-center justify-center w-full h-24 border-t">
        <a
          className="flex items-center justify-center"
          href="https://www.ilirgusija.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by AWS
        </a>
      </footer>
    </div>
  )
}
