var numbersE: any = {
  0: "০",
  1: "১",
  2: "২",
  3: "৩",
  4: "৪",
  5: "৫",
  6: "৬",
  7: "৭",
  8: "৮",
  9: "৯",
};

export function numberToWord(input: any) {
  let toNumber: any = input.toString();
  var output = [];
  for (var i = 0; i < toNumber.length; ++i) {
    if (numbersE.hasOwnProperty(toNumber[i])) {
      output.push(numbersE[toNumber[i]]);
    } else {
      output.push(toNumber[i]);
    }
  }
  return output.join("");
}
