import React from 'react';
import Image from 'next/image'
import profile from '../public/ilir2.jpg';

const about = () => {
  return (
    <>
      <div className='flex  bg-gray-900 z-0'>
        <div className="flex flex-col sm:flex-row-reverse items-center justify-center text-white p-5">
          <div className='flex relative justify-center align-middle flex-auto sm:w-2/5 '>
            <Image src={profile} alt="ilir2" quality={100} className="animate-pulse p-0" />
          </div>
          <div className='flex flex-col relative sm:w-3/5'>
            <p className='about-me-paragraph'>
              Hi there! My name’s Ilir, I am a 4th year student at Queen’s University currently on Internship at Huawei Technologies.
              I study Applied Mathematics and Computer Engineering covering topics such as Control Theory, Distribution Theory, Probability, and Complex Analysis.
            </p>
            <p className='about-me-paragraph'>
              My first work experience came in the form of a Full Stack position at Citi where I worked on a application using a tech stack of Angular, Java Springboot and MongoDB. This position gave me a good introduction to a production environment giving me exposure to numerous technologies, the agile approach to project planning and the expectations of a professional software engineer.
            </p>
            <p className='about-me-paragraph'>
              I now work at Huawei which is a much different environment focused more on R&D. I’ve learned how to navigate through a Linux environment to set up development and testing environments. I’ve leveraged the use of CI/CD technologies such as Jenkins and Docker to create benchmark environments for our software. In addition to this I have also worked closely with LLVM and Clang in tools that make customizations to the way code is analyzed and generated using the Abstract Syntax Tree (AST). Overall, to contrast my previous experience which gave me knowledge a mile wide and a foot deep, this experience has done the opposite in giving me a focused understanding of a few technologies.
            </p>
            <p className='about-me-paragraph'>
              I love learning and expanding my knowledge whether it be computer related or not. I am currently setting out on solidifying my full stack skills by creating this website and implementing different tools along the way. I hope that once this website is done, it will serve as the stage for which I can demonstrate my future projects.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default about