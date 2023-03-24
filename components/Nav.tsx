import Link from 'next/link'
import { AiFillGithub, AiFillLinkedin, AiFillInfoCircle, AiFillHome } from 'react-icons/ai'
import { FC } from 'react'
import Home from '../pages';


const Nav = () => {
    return (
        <div className="sticky left-0 top-0 h-screen w-16 m-0 p-1 justify-center
                    flex flex-col
                    bg-gray-900 text-white shadow-lg z-40">
            <Link href={"/"}>
                <NavBarIcon icon={<AiFillHome size={28} />} text={"Home"}/>
            </Link>
            <Link href={"/about-me"}>
                <NavBarIcon icon={<AiFillInfoCircle size={28} />} text="About Me" />
            </Link>
            <a href="https://github.com/ilirgusija" target={"_blank"} rel="noreferrer">
                <NavBarIcon icon={<AiFillGithub size={28} />} text="My Github" />
            </a>
            <a href="https://www.linkedin.com/in/ilir-gusija/" target="_blank" rel="noreferrer">
                <NavBarIcon icon={<AiFillLinkedin size={28} />} text="My LinkedIn" />
            </a>
        </div>
    )
}

type IconProps = {
    icon: JSX.Element;
    text: string;
};

export const NavBarIcon: FC<IconProps> = ({ icon, text = 'tooltip' }) => (
    <div className='sidebar-icon group'>
        {icon}
        <span className='sidebar-tooltip group-hover:scale-100 '>
            {text}
        </span>
    </div>
);

export default Nav;
