let getMaxSizeOfSquaresInRect = function(n,w,h) {
    var sw, sh;
    var pw = Math.ceil(Math.sqrt(n*w/h));
    if (Math.floor(pw*h/w)*pw < n) sw = h/Math.ceil(pw*h/w);
    else sw = w/pw;
    var ph = Math.ceil(Math.sqrt(n*h/w));
    if (Math.floor(ph*w/h)*ph < n) sh = w/Math.ceil(w*ph/h);
    else sh = h/ph;
    return Math.max(sw,sh);
}

export default function calcSquareSizeFiltered(width,height,cardsNeeded,max) {

    let size;
    let availableWidth = width;
    let bigCardsNeeded = cardsNeeded;
    let availableHeight = height;
    let squareSize;
    let maxSquare = max;
    // let squareSize = Math.floor(Math.min(availableWidth, availableHeight) / Math.sqrt(bigCardsNeeded));
    // squareSize = Math.min(maxSquare,squareSize);
    const squareDimension = getMaxSizeOfSquaresInRect(bigCardsNeeded,availableWidth, availableHeight);
    squareSize = squareDimension;
    size = squareSize;
    size = Math.round(size*100)/100;

    let rowSize = Math.floor(availableWidth/size);
    
    return {rowSize:rowSize,size:size}
}


