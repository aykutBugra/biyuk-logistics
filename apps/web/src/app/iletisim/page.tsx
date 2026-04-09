'use client'
import { useState } from "react";

export default function Page() {
  let [counter, setCounter] = useState(2);
  function degistir(sayi:number){
    let count = counter+sayi;
    console.log(count)
    return count
  
  }
  return <div>
    <button onClick={() => setCounter(counter+degistir(5))}>
      tıkla
    </button>
    <p>counter = {counter}</p>
  </div>;
}
