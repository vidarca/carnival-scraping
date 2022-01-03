const puppeteer = require("puppeteer");
const fs = require("fs");

const getInfoHomePage = async (page) => {

  await page.goto("https://www.carnival.com/cruise-ships.aspx", {
    waitUntil: "load",
    timeout: 0
  });

  return await page.evaluate(() => {
    const temp = [];
    for (const el of document.querySelectorAll("div.activity-result.ship-result")) {
      if (el.dataset.name) {
        let sailTo = [];
        let sailFrom = [];
        let duration = [];
        for (const item of el.querySelectorAll("div.text ul li")) {
          const innerText = item.querySelector("strong").innerText;
          const dataLinks = item.querySelectorAll("a");

          var getBasicDataInfo = (elementList) => {
            const temp = [];
            elementList.forEach(el => {
              temp.push({
                data: el.innerText,
                link: el.href
              });
            });
            return temp;
          }

          switch (innerText.toLowerCase().trim()) {
            case "sail to:":
              sailTo.push(...getBasicDataInfo(dataLinks));
              break;
            case "sail from:":
              sailFrom.push(...getBasicDataInfo(dataLinks));
              break;
            default:
              duration.push(...getBasicDataInfo(dataLinks));
              break;
          }
        }
        temp.push({
          name: el.dataset.name,
          link: el.querySelector("a.upper").href,
          sailTo,
          sailFrom,
          duration
        });
      }
    }
    return temp;
  });
}

const getDataFromPageTypeOne = async (page) => {
  return new Promise(async (resolve, reject) => {
    try {
      await Promise.all([
        page.waitForSelector(".ccl-btn-read-more"),
        page.waitForSelector(".ccl-read-more.clone blockquote p"),
        page.waitForSelector("ul.info li"),
        page.waitForSelector("#deckplans"),
        page.waitForSelector("div.rooms"),
        page.waitForSelector("[data-oba-carousel=ship_related_onboard] .slick-track a"),
        page.waitForSelector("[data-oba-carousel=ship_related_dining] .slick-track a")
      ]).catch(() => reject({}));

      const basicInfo = await page.evaluate(async () => {
        const temp = {
          description: [],
          grossTonnage: 0,
          guestCapacity: 0,
          lengthFt: 0,
          onboardCrew: 0,
          staterooms: [],
          onboardActivities: [],
          onboardDining: [],
        };

        const readMoreDescriptionBtn = document.querySelector(".ccl-btn-read-more");
        readMoreDescriptionBtn.click();
        const descriptionElement = document.querySelectorAll(".ccl-read-more.clone blockquote p");

        descriptionElement.forEach(el => {
          temp.description.push(el.innerText);
        });

        const infoList = document.querySelectorAll("ul.info li");

        temp.grossTonnage = Number(infoList[0].querySelector("strong").innerText.replace(',', ''));
        temp.guestCapacity = Number(infoList[1].querySelector("strong").innerText.replace(',', ''));
        temp.lengthFt = Number(infoList[2].querySelector("strong").innerText.replace(',', ''));
        temp.onboardCrew = Number(infoList[3].querySelector("strong").innerText.replace(',', ''));

        const staterooms = document.querySelectorAll("div.rooms");
        staterooms.forEach(s => {
          const stateroom = {
            name: "",
            img: [],
            description: ""
          };
          const imgs = s.querySelectorAll("slick .slick-slide:not(.slick-cloned) .slide div");

          imgs.forEach(i => {
            stateroom.img.push(window.location.hostname + i.style.backgroundImage.slice(4, -1).replace(/"/g, ""));
          });
          stateroom.name = s.querySelector("h2.title").innerText;
          stateroom.description = s.querySelectorAll(".caption")[1].innerHTML.replace(/<strong>|<\/strong>|\\n/, "");

          temp.staterooms.push(stateroom);
        });

        const onboardActivities = document.querySelectorAll("[data-oba-carousel=ship_related_onboard] .slick-track a");
        onboardActivities.forEach(el => {
          const activity = {
            link: "",
            name: "",
            img: "",
            type: "",
          };
          activity.link = el.href;
          activity.name = el.querySelector(".oba-car-item-desc-title").innerText;
          activity.type = el.querySelector(".oba-car-item-desc-incl").innerText;
          activity.img = window.location.hostname + el.querySelector(".oba-car-item-wrap .oba-car-item-img").style.backgroundImage.slice(4, -1).replace(/"/g, "");
          temp.onboardActivities.push({
            link: el.href,
            name: el.querySelector(".oba-car-item-desc-title").innerText,
            type: el.querySelector(".oba-car-item-desc-incl").innerText,
            img: window.location.hostname + el.querySelector("[role=img]").style.backgroundImage.slice(4, -1).replace(/"/g, ""),
          })
        });

        const onboardDining = document.querySelectorAll("[data-oba-carousel=ship_related_dining] .slick-track a");
        onboardDining.forEach(el => {
          const activity = {
            link: "",
            name: "",
            img: "",
            type: "",
          };
          activity.link = el.href;
          activity.name = el.querySelector(".oba-car-item-desc-title").innerText;
          activity.type = el.querySelector(".oba-car-item-desc-incl").innerText;
          activity.img = window.location.hostname + el.querySelector(".oba-car-item-wrap .oba-car-item-img").style.backgroundImage.slice(4, -1).replace(/"/g, "");
          temp.onboardDining.push({
            link: el.href,
            name: el.querySelector(".oba-car-item-desc-title").innerText,
            type: el.querySelector(".oba-car-item-desc-incl").innerText,
            img: window.location.hostname + el.querySelector("[role=img]").style.backgroundImage.slice(4, -1).replace(/"/g, ""),
          })
        });

        window.location.hash = "#deckplans";

        return temp;
      }).catch(() => {});

      await page.waitForFunction(() => {
        const iframe = document.querySelector('#deckPlansIframe');
        return iframe.contentWindow.document.querySelector(".ship-decks ul[role=presentation] li[role=listitem]");
      }).catch({
        ...basicInfo
      });

      const cruiseTotalDecks = await page.evaluate(() => {
        const iframe = document.querySelector("#deckPlansIframe");
        return iframe.contentWindow.document.querySelectorAll(".ship-decks ul[role=presentation] li[role=listitem]").length;
      }).catch({
        ...basicInfo
      });

      const deckData = [];
      for (let i = 0; i < cruiseTotalDecks; i++) {
        await page.evaluate(i => {
          const iframe = document.querySelector("#deckPlansIframe");
          const decks = iframe.contentWindow.document.querySelectorAll(".ship-decks ul[role=presentation] li[role=listitem]");
          decks[i].querySelector('a[role=application]').click();
        }, i).catch({
          ...basicInfo,
          deckData
        });
        await page.waitForFunction(() => {
          const iframe = document.querySelector("#deckPlansIframe");
          return iframe.contentWindow.document.querySelector("img.mapster_el");
        }, {}).catch({
          ...basicInfo,
          deckData
        });
        const data = await page.evaluate((i) => {
          const deckData = {
            deckNumber: 0,
            name: "",
            img: ""
          }
          const iframe = document.querySelector("#deckPlansIframe");
          const decks = iframe.contentWindow.document.querySelectorAll(".ship-decks ul[role=presentation] li[role=listitem]");
          deckData.deckNumber = Number(decks[i].querySelector("a[role=application] span").innerText);
          deckData.name = decks[i].querySelector("a[role=application]").innerText;
          deckData.img = iframe.contentWindow.document.querySelector("img.mapster_el").src;

          deckFeatures = iframe.contentWindow.document.querySelectorAll(".deck-legend ul.galleries li");
          deckStaterooms = iframe.contentWindow.document.querySelectorAll(".deck-legend ul.staterooms li");
          if (deckFeatures.length) {
            deckData.features = [];
            deckFeatures.forEach(f => {
              deckData.features.push({
                name: f.querySelector("a").innerText
              });
            });
          }
          if (deckStaterooms.length) {
            deckData.staterooms = [];
            deckStaterooms.forEach(s => {
              deckData.staterooms.push({
                type: s.querySelector("span").innerText,
                name: s.innerText
              });
            });
          }
          return deckData;
        }, i).catch({
          ...basicInfo,
          deckData
        });
        deckData.push(data);
      };

      resolve({
        ...basicInfo,
        deckData
      });
    } catch (error) {
      reject(error);
    }
  });
}

const getDataFromPageTypeTwo = async (page) => {
  return new Promise(async (resolve, reject) => {
    try {
      await Promise.all([
        page.waitForSelector(".ships-gallery-slide"),
        page.waitForSelector("#ships-main-nav h2 a"),
        page.waitForSelector(".deck-plans .ships-button"),
        page.waitForSelector(".ships-deck-plan-slide__iframe")
      ]).catch(() => reject({}));

      const basicInfo = await page.evaluate(async () => {
        const temp = {
          description: [],
          deckZones: [],
          staterooms: [],
          onboardActivities: [],
          onboardDining: [],
        };
        var waitFor = (delay) => {
          return new Promise(resolve => setTimeout(resolve, delay));
        }

        const shipDataElements = document.querySelectorAll(".ships-gallery-slide");
        const pageNavs = document.querySelectorAll("#ships-main-nav h2 a");
        let index = 0;
        for (const el of shipDataElements) {
          pageNavs[index].click();
          await waitFor(500);
          const articles = el.querySelectorAll("article");
          var getBasicData = (propertyName, articleElement, articleIndex) => {
            let images = el.querySelectorAll("figure.ships-gallery-tile__hero");
            const introSlide = el.querySelectorAll(".ships-intro-slide");
            if (introSlide.length) {
              images = [
                introSlide[0],
                ...images
              ]
            }
            temp[propertyName].push({
              title: articleElement.querySelector(".ships-gallery-tile__content h3.ships-gallery-tile__title").innerText,
              info: articleElement.querySelector(".ships-gallery-tile__content .ships-gallery-tile__description").innerText,
              img: window.location.hostname + images[articleIndex].style.backgroundImage.slice(4, -1).replace(/"/g, ""),
            });
          }
          articles.forEach((a, articleIndex) => {
            if (a.querySelector(".ships-gallery-tile__content h3.ships-gallery-tile__title")) {
              if (el.dataset.anchor.includes("meet-")) {
                getBasicData("description", a, articleIndex);
              } else if (el.dataset.anchor.includes("zones")) {
                getBasicData("deckZones", a, articleIndex);
              } else if (el.dataset.anchor.includes("onboard-activities")) {
                getBasicData("onboardActivities", a, articleIndex);
              } else if (el.dataset.anchor.includes("dining")) {
                getBasicData("onboardDining", a, articleIndex);
              } else if (el.dataset.anchor.includes("staterooms")) {
                getBasicData("staterooms", a, articleIndex);
              }
            }
          });
          index++;
        };

        window.location.hash = "#deck-plans";
        await waitFor(500);
        document.querySelector(".deck-plans .ships-button").click();

        return temp;
      }).catch(() => reject({}));

      await page.waitForFunction(() => {
        const iframe = document.querySelector('.ships-deck-plan-slide__iframe iframe');
        return iframe.contentWindow.document.querySelector(".ship-decks ul[role=presentation] li[role=listitem]");
      }).catch(() => reject({
        ...basicInfo
      }));

      const cruiseTotalDecks = await page.evaluate(() => {
        const iframe = document.querySelector(".ships-deck-plan-slide__iframe iframe");
        return iframe.contentWindow.document.querySelectorAll(".ship-decks ul[role=presentation] li[role=listitem]").length;
      }).catch(() => reject({
        ...basicInfo
      }));

      const deckData = [];
      for (let i = 0; i < cruiseTotalDecks; i++) {
        await page.evaluate(i => {
          const iframe = document.querySelector(".ships-deck-plan-slide__iframe iframe");
          const decks = iframe.contentWindow.document.querySelectorAll(".ship-decks ul[role=presentation] li[role=listitem]");
          decks[i].querySelector('a[role=application]').click();
        }, i).catch(() => reject({
          ...basicInfo,
          deckData
        }));
        await page.waitForFunction(() => {
          const iframe = document.querySelector(".ships-deck-plan-slide__iframe iframe");
          return iframe.contentWindow.document.querySelector("img.mapster_el");
        }, {}).catch(() => reject({
          ...basicInfo,
          deckData
        }));
        const data = await page.evaluate(i => {
          const deckData = {
            deckNumber: 0,
            name: "",
            img: ""
          }
          const iframe = document.querySelector(".ships-deck-plan-slide__iframe iframe");
          const decks = iframe.contentWindow.document.querySelectorAll(".ship-decks ul[role=presentation] li[role=listitem]");
          deckData.deckNumber = Number(decks[i].querySelector("a[role=application] span").innerText);
          deckData.name = decks[i].querySelector("a[role=application]").innerText;
          deckData.img = iframe.contentWindow.document.querySelector("img.mapster_el").src;

          deckFeatures = iframe.contentWindow.document.querySelectorAll(".deck-legend ul.galleries li");
          deckStaterooms = iframe.contentWindow.document.querySelectorAll(".deck-legend ul.staterooms li");
          if (deckFeatures.length) {
            deckData.features = [];
            deckFeatures.forEach(f => {
              deckData.features.push({
                name: f.querySelector("a").innerText
              });
            });
          }
          if (deckStaterooms.length) {
            deckData.staterooms = [];
            deckStaterooms.forEach(s => {
              deckData.staterooms.push({
                type: s.querySelector("span").innerText,
                name: s.innerText
              });
            });
          }
          return deckData;
        }, i).catch(() => reject({
          ...basicInfo,
          deckData
        }));
        deckData.push(data);
      }

      resolve({
        ...basicInfo,
        deckData
      });
    } catch (error) {
      reject(error);
    }
  });
}

const getEachCruiseData = async (page, dataList) => {

  return new Promise(async (resolve, reject) => {

    try {

      let index = 0;

      const getData = async (data) => new Promise(async (resolve, reject) => {
        try {

          await page.goto(data.link, {
            waitUntil: "load",
            timeout: 0
          });

          let cruiseData;
          let pageType;

          pageType = await page.evaluate(() => {
            const validateType = document.querySelector(".ships__carousel-wrapper");
            if (validateType) {
              return 2;
            }
            return 1;
          });

          if (pageType === 1) {
            cruiseData = await getDataFromPageTypeOne(page);
          } else {
            cruiseData = await getDataFromPageTypeTwo(page);
          }

          resolve(cruiseData);
        } catch (error) {
          await page.reload();
          reject(error);
        }
      });

      const callGetData = () => {
        let lastValue;

        dataList.forEach((data, i) => {
          if (i >= index && i < index + 1) {

            lastValue = index + 1;
            getData(data)
              .then((cruiseData) => {

                dataList[i] = {
                  ...dataList[i],
                  ...cruiseData
                };

                index++;

                if (index < dataList.length && index === lastValue) {
                  callGetData();
                }

                if (index === dataList.length) {
                  resolve();
                }
              })
              .catch((cruiseData) => {
                dataList[i] = {
                  ...dataList[i],
                  ...cruiseData
                };

                index++;

                if (index < dataList.length && index === lastValue) {
                  callGetData();
                }

                if (index === dataList.length) {
                  resolve();
                }
              });
          }
        });
      }

      callGetData();

    } catch (error) {
      reject();
    }

  });

}

(async () => {

  try {
    const browser = await puppeteer.launch({
      defaultViewport: null,
      args: [
        '--window-size=1920,1080',
        '--disable-web-security'
      ]
    });

    const page = await browser.newPage();

    let cruiseShipsData = await getInfoHomePage(page);

    await getEachCruiseData(page, cruiseShipsData);

    fs.unlinkSync("data.json");

    fs.writeFileSync("data.json", JSON.stringify(cruiseShipsData), "utf8");

    await browser.close();

  } catch (error) {

  }

})();
