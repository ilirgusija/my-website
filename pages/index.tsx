import Head from 'next/head'
import Nav from '../components/Nav'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <div className='flex'>
      <Head>
        <title>{"Ilir Gusija's Website"}</title>
        <meta name='keywords' content="Ilir Gusija's portfolio" />
      </Head>
      <Nav/>
      <h1>Welcome to my website</h1>
    </div>
  )
}
