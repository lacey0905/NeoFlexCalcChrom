document.addEventListener("DOMContentLoaded", async () => {
  const resultElement = document.getElementById("result");
  let requiredWorkHours = 0;
  let dayLeft = 0;
  let realWorkHours = 0;
  let remainingWorkHours = 0;

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

        // 인정 근로 시간 찾기
        const realWorkTimeElement = Array.from(pTags).find((p) =>
          p.textContent.includes("인정 근로 시간")
        );
        const realWorkTimeText =
          realWorkTimeElement
            ?.querySelector(".float-right")
            ?.textContent.trim() || "";
        const hoursMatch = realWorkTimeText.match(/(\d+)시간/);
        const minutesMatch = realWorkTimeText.match(/(\d+)분/);
        const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
        const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
        const realWorkTime = hours * 60 + minutes; // 분 단위로 변환

        // 의무 근로 시간 찾기
        const mandatoryWorkTimeElement = document.querySelector(
          "div.stat-title.text-sm"
        );
        const mandatoryWorkTimeText =
          mandatoryWorkTimeElement?.nextElementSibling?.textContent.trim() ||
          "";
        const mandatoryWorkTime =
          parseInt(mandatoryWorkTimeText.match(/\d+/)?.[0] || "0") * 60; // 분 단위로 변환

        // 남은 일수 찾기
        const dayLeftElement = pTags[5];
        const dayLeftText =
          dayLeftElement?.querySelector(".float-right")?.textContent.trim() ||
          "";
        const dayLeft = parseInt(dayLeftText.match(/\d+/)?.[0] || "0");

        return {
          mandatoryWorkTime: mandatoryWorkTime,
          realWorkTime: realWorkTime,
          dayLeft: dayLeft,
        };
      },
    });

    const data = results[0].result;
    requiredWorkHours = data.mandatoryWorkTime || 0;
    dayLeft = data.dayLeft || 0;
    realWorkHours = data.realWorkTime || 0;
    remainingWorkHours = requiredWorkHours - realWorkHours;

    // 초과 근무 시간 계산 수정
    // (인정 근로 시간 - 의무 근로 시간) + 마지막 날의 8시간
    const basicOverHours = realWorkHours - requiredWorkHours; // 기본 초과 시간
    const overWorkHours = basicOverHours + 8 * 60; // 마지막 날의 8시간 추가

    const displayRealHours = Math.floor(realWorkHours / 60);
    const displayRealMinutes = realWorkHours % 60;
    const displayRemainingHours = Math.floor(remainingWorkHours / 60);
    const displayRemainingMinutes = remainingWorkHours % 60;
    const displayOverHours = Math.floor(overWorkHours / 60);
    const displayOverMinutes = overWorkHours % 60;

    resultElement.innerHTML = `
      <p class="text-sm text-muted">의무 근로 시간: ${Math.floor(
        requiredWorkHours / 60
      )}시간</p>
      <p class="text-sm text-muted">인정 근로 시간: ${displayRealHours}시간 ${displayRealMinutes}분</p>
      <p class="text-sm text-muted">남은 근무 시간: ${displayRemainingHours}시간 ${displayRemainingMinutes}분</p>
      <p class="text-sm text-muted">남은 일수: ${dayLeft}일</p>
      <p class="text-sm text-muted">이미 NeoDot에 쉴 수 있을 뿐만 아니라</p>
      <p class="text-sm font-semibold">${displayOverHours}시간 ${displayOverMinutes}분</p>
      <p class="text-sm text-muted">을 초과 근무 했습니다.</p>
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
