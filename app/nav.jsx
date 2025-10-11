import Link from "next/link"
import "./globals.css"
import Image from "next/image"

export default function Navbar(){
    return(
        <div className=" flex bg-orange-400 smp-3 font-medium place-content-between text-lg sm:text-xl content-center">
            <div className="content-center">
           <Link className="p-2 sm:m-1 rounded-lg  text-white hover:text-orange-400 hover:bg-white hover:transition ease-in duration-200" href={"/Home"}>Home</Link>
           <Link className="p-2 sm:m-1 rounded-lg  text-white hover:text-orange-400 hover:bg-white hover:transition ease-in duration-200" href={"/Home"}>Social</Link>
            <Link className="p-2 sm:m-1 rounded-lg  text-white hover:text-orange-400 hover:bg-white hover:transition ease-in duration-200" href={"/Home"}>Market</Link>
            <Link className="p-2 sm:m-1 rounded-lg  text-white hover:text-orange-400 hover:bg-white hover:transition ease-in duration-200" href={"/Home"}>hhh</Link>
                
        </div>
        <div className="flex">
            <button onClick={()=>{window.location.replace("/Addpet")}} className=" hidden sm:block m-3 bg-yellow-400 p-2 hover:shadow-lg rounded-lg">+Add Pet</button>
             <Link href={"/Profile"}>
             <Image
              className="m-3 mt-2 block w-10 rounded-full h-10 p-0"
             src="/imgs/profile.jpg"
             alt="profile"
             width={100} height={100}
             />
             </Link>
              
        </div>
        </div>
        
    )
}