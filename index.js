const puppeteer = require("puppeteer");
const fs = require("fs");

const getInfoHomePage = async (browser) => {

  const page = await browser.newPage();

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

const getDataFromPageTypeOne = async (page) => await page.evaluate(async () => {
  const temp = {
    description: [],
    grossTonnage: 0,
    guestCapacity: 0,
    lengthFt: 0,
    onboardCrew: 0,
    deckData: [],
    staterooms: [],
    onboardActivities: [],
    onboardDining: [],
  };

  var waitFor = (delay) => {
    return new Promise(resolve => setTimeout(resolve, delay));
  }
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

  const iframe = document.querySelector("#deckPlansIframe");
  const cruiseDecks = iframe.contentWindow.document.querySelectorAll(".ship-decks ul[role=presentation] li[role=listitem]");

  for (const deck of cruiseDecks) {
    const deckData = {
      deckNumber: 0,
      name: "",
      img: ""
    }
    deck.querySelector("a[role=application]").click();
    await waitFor(10000);
    deckData.deckNumber = Number(deck.querySelector("a[role=application] span").innerText);
    deckData.name = deck.querySelector("a[role=application]").innerText;
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
    temp.deckData.push(deckData);
  }

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

  return temp;
});

const getDataFromPageTypeTwo = async (page) => {
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
      await waitFor(1000);
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
          switch (index) {
            case 0:
              getBasicData("description", a, articleIndex);
              break;
            case 1:
              getBasicData("deckZones", a, articleIndex);
              break;
            case 2:
              getBasicData("onboardActivities", a, articleIndex);
              break;
            case 3:
              getBasicData("onboardDining", a, articleIndex);
              break;
            case 4:
              getBasicData("staterooms", a, articleIndex);
              break;
          }
        }
      });
      index++;
    };

    pageNavs[5].click();
    await waitFor(1000);
    document.querySelector(".deck-plans .ships-button").click();

    return temp;
  });

  await new Promise((resolve) => {
    validateElement = async () => {
      const resolved = await page.evaluate(() => {
        const iframe = document.querySelector(".ships-deck-plan-slide__iframe iframe");
        if (iframe && iframe.contentWindow.document.querySelector(".ship-decks ul[role=presentation] li[role=listitem]")) {
          return true;
        }
        return false;
      });
      if (resolved) {
        clearInterval(interval);
        resolve();
      }
    };
    const interval = setInterval(validateElement, 500);
  });

  const deckData = await page.evaluate(async () => {
    const temp = {
      deckData: [],
    };
    var waitFor = (delay) => {
      return new Promise(resolve => setTimeout(resolve, delay));
    }

    const iframe = document.querySelector(".ships-deck-plan-slide__iframe iframe");
    const cruiseDecks = iframe.contentWindow.document.querySelectorAll(".ship-decks ul[role=presentation] li[role=listitem]");

    for (const deck of cruiseDecks) {
      const deckData = {
        deckNumber: 0,
        name: "",
        img: ""
      }
      deck.querySelector("a[role=application]").click();
      await waitFor(10000);
      deckData.deckNumber = Number(deck.querySelector("a[role=application] span").innerText);
      deckData.name = deck.querySelector("a[role=application]").innerText;
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
      temp.deckData.push(deckData);
    }
    return temp;
  });

  return {
    ...basicInfo,
    ...deckData
  }
}

const getEachCruiseData = async (browser, dataList, unlimited, limit) => {

  return new Promise(async (resolve, reject) => {

    try {

      let index = 0;

      const getData = async (data) => {
        const page = await browser.newPage();

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
          await new Promise((resolve) => {
            validateElement = async () => {
              const resolved = await page.evaluate(() => {
                const iframe = document.querySelector("#deckPlansIframe");
                if (iframe && iframe.contentWindow.document.querySelector(".ship-decks ul[role=presentation] li[role=listitem]")) {
                  return true;
                }
                return false;
              });
              if (resolved) {
                clearInterval(interval);
                resolve();
              }
            };
            const interval = setInterval(validateElement, 500);
          });
          cruiseData = await getDataFromPageTypeOne(page);
        } else {
          cruiseData = await getDataFromPageTypeTwo(page);
        }

        page.close();

        return cruiseData;
      };

      const callGetData = () => {
        let lastValue;
        const maxValue = unlimited ? dataList.length : limit;

        dataList.forEach((data, i) => {
          if (i >= index && i < index + maxValue) {

            lastValue = index + maxValue;
            getData(data).then((cruiseData) => {

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
    let unlimited = false;
    let limit = 1;
    process.argv.forEach(function (val) {
      if (val.includes("unlimited")) {
        unlimited = true;
      }
      if (val.includes("limit")){
        limit = val.split("=")[1];
      }
    });

    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      args: [
        '--window-size=1920,1080'
      ]
    });

    let cruiseShipsData = await getInfoHomePage(browser);

    await getEachCruiseData(browser, cruiseShipsData, unlimited, limit);

    fs.write("data.json", JSON.stringify(cruiseShipsData), "utf8");

    await browser.close();

  } catch (error) {

  }

})();