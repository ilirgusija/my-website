import React from 'react';
import { AiFillGithub, AiFillLinkedin } from 'react-icons/ai';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-row flex-wrap items-center justify-center text-center">
          <div className="w-full md:w-auto md:mr-4">
            <p className="text-sm mb-4 md:mb-0">&copy; {new Date().getFullYear()} Ilir. All rights reserved.</p>
          </div>
          <div className="flex flex-row w-full md:w-auto">
            <a href="https://github.com/ilirgusija" target="_blank" rel="noopener noreferrer" className="text-2xl mx-4">
              <AiFillGithub />
            </a>
            <a href="https://linkedin.com/in/ilir-gusija" target="_blank" rel="noopener noreferrer" className="text-2xl mx-4">
              <AiFillLinkedin />
            </a>
          </div>
          <div className="w-full md:w-auto md:ml-4">
            <p className="text-sm">
              Email: <a href="mailto:ilirgusija@gmail.com" className="text-blue-400">ilirgusija@gmail.com</a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
