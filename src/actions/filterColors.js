import { hsl } from "d3";

export default function filterColor(courts,colorSet) {

    let colorsWithin = courts.filter(d => {
        let colorHex = d.color;
        let hsld = hsl(colorHex);
        let hslSet = hsl(colorSet);
        let saturation = hsld.s;
        let diff = hsld.h - hslSet.h;
        if(diff < 70 && diff > -70 && saturation > .3){
            return d;
        }
    }).map(d => {
        return d.id;
    })

    console.log(colorsWithin.length)

    return colorsWithin
}