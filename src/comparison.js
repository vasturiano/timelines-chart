function alphaNumCmp(a,b){
  const alist = a.split(/(\d+)/),
    blist = b.split(/(\d+)/);

  (alist.length && alist[alist.length-1] == '') ? alist.pop() : null; // remove the last element if empty
  (blist.length && blist[blist.length-1] == '') ? blist.pop() : null; // remove the last element if empty

  for (let i = 0, len = Math.max(alist.length, blist.length); i < len;i++){
    if (alist.length==i || blist.length==i) { // Out of bounds for one of the sides
      return alist.length - blist.length;
    }
    if (alist[i] != blist[i]){ // find the first non-equal part
      if (alist[i].match(/\d/)) // if numeric
      {
        return (+alist[i])-(+blist[i]); // compare as number
      } else {
        return (alist[i].toLowerCase() > blist[i].toLowerCase())?1:-1; // compare as string
      }
    }
  }
  return 0;
}

export { alphaNumCmp };