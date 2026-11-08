'use strict';
window.G = window.G || {};
// 첫 화면 흐름: 목소리 언어 → 접속 방식(혼자 · 방 만들기 · 코드로 참가) → 인물 선택.
(function (G) {
  const $ = (id) => document.getElementById(id);

  function showStep(id) {
    ['langPick', 'modePick'].forEach((step) => { $(step).hidden = step !== id; });
    document.querySelector('.menu-in').hidden = id !== 'chars';
  }

  function focusFirst(selector) {
    const node = document.querySelector(selector);
    if (node) node.focus({ preventScroll: true });
  }

  function info(text) {
    const node = $('netInfo');
    node.textContent = text || '';
    node.hidden = !text;
  }

  // 다른 사람이 고른 인물은 누를 수 없다.
  function markTaken(taken) {
    document.querySelectorAll('.char').forEach((button) => {
      const used = taken.includes(Number(button.dataset.id));
      button.disabled = used;
      button.classList.toggle('taken', used);
    });
  }

  function openChars(text) {
    showStep('chars');
    info(text);
    focusFirst('.char:not(:disabled)');
  }

  function init(hooks) {
    const msg = $('modeMsg');
    const controls = [...document.querySelectorAll('#modePick button, #joinCode')];
    const busy = (on, text) => {
      controls.forEach((b) => { b.disabled = on; });
      msg.textContent = text || '';
    };

    document.querySelectorAll('#langPick [data-lang]').forEach((button) => {
      button.addEventListener('click', () => {
        G.Voice.setLang(button.dataset.lang);
        G.Voice.unlock();
        G.audio.unlock();
        showStep('modePick');
        focusFirst('#modePick [data-mode]');
      });
    });

    document.querySelector('[data-mode="solo"]').addEventListener('click', () => openChars(''));

    document.querySelector('[data-mode="host"]').addEventListener('click', async () => {
      busy(true, '방을 여는 중…');
      try {
        const code = await G.Net.host();
        busy(false);
        openChars(`방 코드 ${code} · 함께할 사람에게 알려 주세요 (최대 6명)`);
      } catch (err) {
        busy(false, err.message);
      }
    });

    G.Net.setUI({
      onWelcome: (seed, taken) => {
        hooks.reseed(seed);
        busy(false);
        markTaken(taken);
        openChars(`방 ${G.Net.code()}에 연결됨 · 인물을 고르세요`);
      },
      onTaken: (taken) => {
        markTaken(taken);
        info('다른 사람이 먼저 고른 인물입니다. 다른 인물을 고르세요.');
      },
      onStart: (start) => {
        if (Number.isInteger(start.charId)) hooks.clientStart(start);
      },
      onStatus: (text) => { busy(false, text); info(text); },
      onLost: hooks.lost,
      onBack: hooks.back,
    });

    $('joinForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      busy(true, '방을 찾는 중…');
      try {
        await G.Net.join($('joinCode').value);
        msg.textContent = '연결됨 · 건물 정보를 받는 중…';
      } catch (err) {
        busy(false, err.message);
      }
    });

    showStep('langPick');
    focusFirst('#langPick [data-lang]');
  }

  G.Lobby = { init, info, markTaken };
})(window.G);
