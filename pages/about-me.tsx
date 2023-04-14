import React from 'react';
import Image from 'next/image';
import profile from '../public/ilir2.jpg';
import Head from 'next/head';

const About = () => {
  return (
    <>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="h-full flex flex-col bg-white text-gray-900">
        <div className="flex-grow-0 pt-5 pb-5 px-5 text-center">
          <h1 className="text-4xl font-bold">About Me</h1>
          <p className="text-xl mt-2">Get to know me a bit better</p>
        </div>
        <div className="flex-grow flex flex-col md:flex-row items-center justify-center space-y-10 md:space-y-0 md:space-x-10 p-5">
          <div className="w-full md:w-2/5 flex justify-center animate-fadeIn md:items-end">
            <div className="w-full md:w-auto h-full animate-fade-in">
              <Image
                src={profile}
                alt="ilir2"
                quality={100}
                layout="responsive"
                width={1}
                height={1}
                className="rounded-full object-cover md:h-[16rem] md:w-auto"
              />
            </div>
          </div>
          <div className="w-full md:w-3/5 space-y-4 animate-slide-in">
            <div className="bg-gray-100 p-6 rounded-md shadow-md">
              <p className="font-roboto text-base text-justify">
                My name is Ilir, and I'm a 4th-year student at Queen's University, currently interning at Huawei Technologies. I'm passionate about Applied Mathematics and Computer Engineering, with a focus on topics like Control Theory, Distribution Theory, Probability, and Complex Analysis.
              </p>
            </div>
            <div className="bg-gray-100 p-6 rounded-md shadow-md">
              <p className="font-roboto text-base text-justify">
                My professional journey began at Citi as a Full Stack Developer, where I honed my skills in Angular, Java Springboot, and MongoDB. Now, I work in a research-driven environment at Huawei, where I've developed expertise in CI/CD technologies, LLVM, Clang, and AST analysis.
              </p>
            </div>
            <div className="bg-gray-100 p-6 rounded-md shadow-md">
              <p className="font-roboto text-base text-justify">
                I'm a lifelong learner, always eager to expand my knowledge in computing and beyond. I've created this website to showcase my full-stack abilities and to serve as a platform for demonstrating my future projects.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default About;
