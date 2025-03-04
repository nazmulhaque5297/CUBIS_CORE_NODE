const pdf = require("html-pdf");

function bangToEng(str: string): string {
  const banglaNumber: { [key: number]: string } = {
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

  if (str) {
    for (const digit of str.toString()) {
      str = str.toString().replace(new RegExp(digit, "g"), banglaNumber[parseInt(digit)]);
    }
  }
  
  return str;
}


export const getSamityDataByUser = async (samityInfo: any, DesignationDetails: any) => {
  let updatedContent: any = "";
  const byLaws: any[] = samityInfo.samityInfo.byLaws;
  const memberArea: any[] = samityInfo.memberArea;
  const workingArea: any[] = samityInfo.workingArea;

  byLaws?.map(element => {
    if (element.nameEn == "samityName_Address") {
      updatedContent = updatedContent + `<h3 style="text-align: center">${element?.name}</h3>`;
      element.data.map((row: any) => {
        if (row.type == "partial") {
          updatedContent =
            updatedContent +
            `<div>
              <h4 style="line-height:1;">${row?.sectionNo}| ${row?.sectionName}:- </h4>
              <div style="margin-left: 20px; text-align: justify; line-height:1;">
                ${row.data.map((obj: any) => obj.data).join(" ")}
              </div>
            </div>`;
        } else if (row.type == "dynamic") {
          updatedContent =
            updatedContent +
            `<div>
              <h4 style="line-height:1;">${row?.sectionNo}| ${row?.sectionName}:- </h4>
              <div style="margin-left: 20px; text-align: justify; line-height:1;">
                ${row?.data}
              </div>
              <div style="margin-left: 20px; text-align: justify; line-height:1;">
                </br>
                  <table class="address">
                    <tr>
                      <td>গ্রামঃ ${samityInfo.samityInfo.samityDetailsAddress} </td>
                      <td>উপজেলাঃ ${samityInfo.samityInfo.uniThanaPawNameBangla}</td>
                    </tr>
                    <tr>
                      <td>জেলাঃ ${samityInfo.samityInfo.officeDistrictNameBangla}</td>
                      <td>বিভাগঃ ${samityInfo.samityInfo.officeDivisionNameBangla}</td>
                    </tr>
                  </table>
                </br>
              </div>
              <div style="margin-left: 20px; text-align: justify; line-height:1;">
                ${row?.noted}
              </div>
            </div>`;
        }
      });
    } else if (element.nameEn == "memberWorking_Area") {
      updatedContent = updatedContent + `<h4 style="text-align: center">${element?.name}</h4>`;
      element.data.map((row: any) => {
        if (row.areaType == "memberArea") {
          updatedContent =
            updatedContent +
            `<div>
          <h4 style="line-height:1;">${row?.sectionNo}| ${row?.sectionName}:- </h4>
          <div style="margin-left: 20px; text-align: justify">
          <table class="memWorkTab">
          <tr>
            <th>বিভাগ</th>
            <th>জেলা</th>
            <th>উপজেলা</th>
            <th>ইউনিয়ন</th>
            <th>গ্রাম</th>
          </tr>`;
          memberArea.map((elements: any) => {
            updatedContent =
              updatedContent +
              `<tr>
              <td>${elements.divisionNameBangla} </td>
              <td>${elements.districtNameBangla}</td>
              <td>${elements.upaCityNameBangla}</td>
              <td>${elements.uniThanaPawNameBangla ? elements.uniThanaPawNameBangla : ""}</td>
              <td>${elements.detailsAddress ? elements.detailsAddress : ""}</td>
            </tr>`;
          });
          updatedContent =
            updatedContent +
            `</table>
          </div>
        </div>`;
        } else if (row.areaType == "workingArea") {
          updatedContent =
            updatedContent +
            `<div>
          <h4 style="line-height:1;">${row?.sectionNo}| ${row?.sectionName}:- </h4>
          <div style="margin-left: 20px; text-align: justify">
          <table class="memWorkTab">
          <tr>
            <th>বিভাগ</th>
            <th>জেলা</th>
            <th>উপজেলা</th>
            <th>ইউনিয়ন</th>
            <th>গ্রাম</th>
          </tr>`;
          workingArea.map((elements: any) => {
            updatedContent =
              updatedContent +
              `<tr>
            <td>${elements.divisionNameBangla} </td>
            <td>${elements.districtNameBangla}</td>
            <td>${elements.upaCityNameBangla}</td>
            <td>${elements.uniThanaPawNameBangla ? elements.uniThanaPawNameBangla : ""}</td>
            <td>${elements.detailsAddress ? elements.detailsAddress : ""}</td>
          </tr>`;
          });
          updatedContent =
            updatedContent +
            `</table>
        </div>
      </div>`;
        }
      });
    } else {
      updatedContent = updatedContent + `<h4 style="text-align: center">${element?.name}</h4>`; //all else Head print here
      element.data.map((row: any) => {
        if (row.type == "partial") {
          updatedContent =
            updatedContent +
            `<div>
            <h4 style="line-height:1;">${row?.sectionNo}| ${row?.sectionName}:- </h4>
            <div style="margin-left: 20px; text-align: justify">
              ${row.data.map((obj: any) => obj.data).join(" ")}
            </div>
          </div>`;
        } else if (row.type == "text") {
          updatedContent =
            updatedContent +
            `<div>
            <h4 style="line-height:1;">${row?.sectionNo}| ${row?.sectionName}:- </h4>
            <div style="margin-left: 20px; line-height:1;text-align: justify">${row?.data}</div> 
          </div>`;
        }
      });
    }
  });
  const options = {
    format: "A4",
    orientation: "portrait",
    border: {
      top: "60px",
      bottom: "5px",
      left: "70px",
      right: "30px",
    },
    footer: {
      height: "120px",
      contents: {
        default: `<hr style="border-top: 3px solid black;">
        <table style="width: 100%; margin: 0; padding:0">
            <tr>
                <td style="width: 15%;">
                    <div>
                    ${
                      DesignationDetails.sealUrl
                        ? `<img src="${DesignationDetails.sealUrl}" style="width: 30px; height: 30px;" alt="seal" />`
                        : ""
                    }
                      <div>সীলমোহর</div>
                    </div>
                </td>
                <td>
                    <div style="text-align: center;">
                    ${
                      DesignationDetails.signatureUrl
                        ? `<img src="${DesignationDetails.signatureUrl}" style="width: 30px; height: 30px;" alt="seal" />`
                        : ""
                    }
                      <div>${DesignationDetails.nameBn}</div>
                      <div>${DesignationDetails.designation}</div>
                      <div>${DesignationDetails.mobile}</div>
                    </div>
                </td>
                <td>
                    <div style="margin: 0 0 0 auto; text-align: right;">
                        <div>{{page}}</div>
                        <div>${new Date().toLocaleString()}</div>
                    </div>
                </td>
            </tr>
        </table>`,
        
      },
    },
  }; //pdf formet option
  const finalHtmlCode = `<!DOCTYPE html>
                          <html>
                            <head>
                              <style>
                                @font-face {
                                  font-family: 'Nikosh';
                                  src: url('./fonts/NikoshRegular.ttf');
                                }
                                body {
                                  font-family: 'Nikosh', Arial, sans-serif;
                                  margin: 0px;
                                  padding: 0px;
                                }
                                .page-number:before {
                                  content: counter(page);
                                }
                                .total-pages:before {
                                  content: counter(pages);
                                }
                                table {
                                  border-collapse: collapse;
                                  width: 100%;
                                }
                                .address td {
                                  text-align: left;
                                  padding: 8px;
                                  width: 50%;
                                }
                                .memWorkTab th {
                                  border-right: 1px solid gray;
                                  text-align: center;
                                }
                                .memWorkTab td {
                                  border-right: 1px solid gray;
                                  padding-left: 5px
                                }
                                .memWorkTab tr {
                                  border-bottom: 1px solid gray
                                }
                                .memWorkTab {
                                  border: 1px solid gray
                                }
                                li {
                                  line-height: 1;
                                  padding-bottom: 0;
                                }
                              </style>
                            </head>
                            <body>
                            <div style="text-align: center;">
                                <h3 style="line-height:1">${samityInfo.samityInfo.samityName}</h3>
                                <h4 style="line-height:1">
                                    <span>এর</span><br>
                                    <span>উপ আইন</span><br>
                                    <span>(সমবায় সমিতি আইন, ২০০১ অনুসারে নিবন্ধনকৃত)</span><br>
                                </h4>
                            </div>
                              <div>${updatedContent}</div>
                              <img src="${DesignationDetails.sealUrl}" style="width: 1px; height: 1px;" alt="seal" />
                            </body>
                          </html>`;
  return new Promise((resolve, reject) => {
    pdf.create(finalHtmlCode, options).toBuffer((err: Error, buffer: Buffer) => {
      if (err) {
        reject(err);
      } else {
        // fs.writeFileSync("sample.pdf", buffer);
        resolve(buffer);
      }
    });
  });
};
