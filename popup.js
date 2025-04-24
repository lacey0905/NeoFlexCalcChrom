document.addEventListener("DOMContentLoaded", async () => {
  const resultElement = document.getElementById("result");

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || !tab.url) {
      throw new Error("현재 탭의 URL을 가져올 수 없습니다.");
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const elements = document.querySelectorAll(
          ".px-2.pb-3.text-sm.leading-7"
        );
        const pTags = Array.from(elements).flatMap((element) =>
          Array.from(element.querySelectorAll("p"))
        );

        const data = [pTags[3], pTags[4], pTags[5]].map((p, index) => {
          const key = Array.from(p.childNodes)
            .filter((node) => node.nodeType === Node.TEXT_NODE)
            .map((node) => node.textContent.trim())
            .join(" ")
            .trim();

          let value = p.querySelector(".float-right")?.textContent.trim() || "";

          const convertToMilliseconds = (timeStr) => {
            const hoursMatch = timeStr.match(/(\d+)시간/);
            const minutesMatch = timeStr.match(/(\d+)분/);

            const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
            const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

            return hours * 60 * 60 * 1000 + minutes * 60 * 1000;
          };

          const keyNames = ["totalWorkData", "timeLeft", "dayLeft"];
          if (index < 2) {
            value = convertToMilliseconds(value);
          } else {
            value = parseInt(value.match(/\d+/)[0]);
          }

          return { [keyNames[index]]: value };
        });

        const timeLeft = data[1].timeLeft;
        const dayLeft = data[2].dayLeft;
        const eightHoursInMs = 8 * 60 * 60 * 1000;
        const remainingTimeMs = Math.abs(timeLeft - dayLeft * eightHoursInMs);

        const convertMsToTime = (ms) => {
          const totalMinutes = Math.floor(ms / (60 * 1000));
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          return {
            hours: hours,
            minutes: minutes,
          };
        };

        const remainingTime = convertMsToTime(remainingTimeMs);
        const remainingTimeMinus8HoursMs = Math.abs(
          remainingTimeMs - eightHoursInMs
        );
        const remainingTimeMinus8Hours = convertMsToTime(
          remainingTimeMinus8HoursMs
        );

        return {
          ...data[0],
          ...data[1],
          ...data[2],
          remainingTimeMs: remainingTimeMs,
          remainingTime: `${remainingTime.hours}시간 ${remainingTime.minutes}분`,
          remainingTimeMinus8HoursMs: remainingTimeMinus8HoursMs,
          remainingTimeMinus8Hours: `${remainingTimeMinus8Hours.hours}시간 ${remainingTimeMinus8Hours.minutes}분`,
        };
      },
    });

    const data = results[0].result;

    if (!data || !data.remainingTimeMinus8Hours) {
      resultElement.innerHTML = `
        <p class="text-sm text-muted">근무 데이터를 확인 할 수 없습니다.</p>
        <a href="#" id="neoFlexLink" class="link">NeoFlex 웹사이트로 이동</a>
      `;

      document
        .getElementById("neoFlexLink")
        .addEventListener("click", async (e) => {
          e.preventDefault();
          window.close(); // 팝업을 먼저 닫고
          await chrome.tabs.update({ url: "https://neo-flex.neowiz.com/" }); // 그 다음 탭 업데이트
        });

      return;
    }

    resultElement.innerHTML = `
      <p class="text-sm text-muted">이미 NeoDot에 쉴 수 있을 뿐만 아니라</p>
      <p class="text-sm font-semibold">${data.remainingTimeMinus8Hours}</p>
      <p class="text-sm text-muted">만큼 초과 근로 했습니다.</p>
      <p class="text-sm text-muted">* 8시간 기준 근무 시간 대비 초과 근무 시간</p>
    `;
  } catch (error) {
    console.error("요소를 찾는 중 오류 발생:", error);
    resultElement.innerHTML = `
      <p class="text-sm text-muted">근무 데이터를 확인 할 수 없습니다.</p>
      <a href="#" id="neoFlexLink" class="link">NeoFlex 웹사이트로 이동</a>
    `;

    document
      .getElementById("neoFlexLink")
      .addEventListener("click", async (e) => {
        e.preventDefault();
        window.close();
        await chrome.tabs.update({ url: "https://neo-flex.neowiz.com/" });
      });
  }
});
