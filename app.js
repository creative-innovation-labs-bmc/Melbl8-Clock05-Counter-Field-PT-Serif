(() => {
  'use strict';

  const CF = window.CounterField;
  const c = CF.constants;
  const colours = CF.colours;
  const options = CF.options;

  const viewport = document.getElementById('viewport');
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('field');
  const status = document.getElementById('status');
  const ctx = canvas.getContext('2d', {
    alpha: false,
    desynchronized: true
  });

  canvas.width = Math.round(c.LOGICAL_W * options.renderScale);
  canvas.height = Math.round(c.LOGICAL_H * options.renderScale);
  ctx.setTransform(
    options.renderScale, 0, 0, options.renderScale, 0, 0
  );
  ctx.imageSmoothingEnabled = true;

  let atlas = null;
  let lastFrameAt = 0;
  let lastAnnouncedSecond = -1;
  let pageVisible = !document.hidden;

  function createAtlas() {
    const scale = options.renderScale;
    const cellW = Math.ceil(17 * scale);
    const cellH = Math.ceil(20 * scale);
    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = cellW * 10;
    atlasCanvas.height = cellH * 4;
    const a = atlasCanvas.getContext('2d');

    a.textAlign = 'center';
    a.textBaseline = 'middle';
    a.font = `700 ${Math.round(14 * scale)}px "PT Serif", Georgia, serif`;

    const styles = [
      { colour: colours.grey2, alpha: 0.20 },
      { colour: colours.white, alpha: 0.96 },
      { colour: colours.green, alpha: 1 },
      { colour: colours.white, alpha: 0.74 }
    ];

    styles.forEach((style, row) => {
      a.globalAlpha = style.alpha;
      a.fillStyle = style.colour;
      for (let digit = 0; digit < 10; digit++) {
        a.fillText(
          String(digit),
          digit * cellW + cellW / 2,
          row * cellH + cellH / 2 + scale
        );
      }
    });

    a.globalAlpha = 1;
    return { canvas: atlasCanvas, cellW, cellH, scale };
  }

  function drawAtlasDigit(value, x, y, styleRow, alpha = 1, size = 1) {
    const { canvas: image, cellW, cellH, scale } = atlas;
    const sx = (value % 10) * cellW;
    const sy = styleRow * cellH;
    const dw = (cellW / scale) * size;
    const dh = (cellH / scale) * size;

    ctx.globalAlpha = alpha;
    ctx.drawImage(
      image,
      sx, sy, cellW, cellH,
      x - dw / 2, y - dh / 2, dw, dh
    );
  }

  function drawHeader(state) {
    ctx.globalAlpha = 1;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    ctx.fillStyle = colours.white;
    ctx.font = '400 17px "Open Sans", Arial, sans-serif';
    ctx.fillText('MEL', 73, 27);

    ctx.fillStyle = colours.green;
    ctx.fillRect(124, 25, 18, 3);

    ctx.fillStyle = 'rgba(255,255,255,.58)';
    ctx.font = '400 10px "Open Sans", Arial, sans-serif';
    ctx.fillText(state.label, 158, 27);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,.42)';
    ctx.font = '400 10px "Open Sans", Arial, sans-serif';
    ctx.fillText(
      'COUNTER FIELD  /  PT SERIF  /  LIVE MELBOURNE TIME',
      c.LOGICAL_W - 73,
      27
    );
  }

  function drawBackground(nowPerf, state) {
    ctx.fillStyle = colours.bg;
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, c.LOGICAL_W, c.LOGICAL_H);

    const pulseAge = nowPerf - CF.runtime.minutePulseStart;
    const scanX = pulseAge >= 0 && pulseAge < 1800
      ? -120 + (c.LOGICAL_W + 240) * (pulseAge / 1800)
      : -1000;

    for (const cell of CF.backgroundCells) {
      const wave = Math.sin(nowPerf * 0.00035 * cell.speed + cell.phase);
      const y = cell.y + (options.noMotion ? 0 : wave * 1.3);
      const distance = Math.abs(cell.x - scanX);
      const boost = distance < 82 ? (1 - distance / 82) * 0.26 : 0;

      drawAtlasDigit(
        cell.value,
        cell.x,
        y,
        boost > 0.045 ? 2 : 0,
        Math.min(0.28, cell.opacity + boost),
        0.70
      );
    }

    if (scanX > -160) {
      const gradient = ctx.createLinearGradient(
        scanX - 90, 0, scanX + 90, 0
      );
      gradient.addColorStop(0, 'rgba(137,201,37,0)');
      gradient.addColorStop(0.5, 'rgba(137,201,37,0.08)');
      gradient.addColorStop(1, 'rgba(137,201,37,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(scanX - 90, 0, 180, c.LOGICAL_H);
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.fillRect(72, c.FRAME_TOP, c.LOGICAL_W - 144, 1);
    ctx.fillRect(72, c.FRAME_BOTTOM, c.LOGICAL_W - 144, 1);

    drawHeader(state);
  }

  function drawClock(nowPerf, state) {
    for (const cell of CF.digitCells) {
      if (!cell.active) {
        drawAtlasDigit(
          cell.ambientValue,
          cell.x,
          cell.y + (
            options.noMotion
              ? 0
              : Math.sin(nowPerf * 0.0015 + cell.phase) * cell.jitter
          ),
          0,
          0.072,
          0.76
        );
        continue;
      }

      const settled = state.logicalMs >= cell.settleAt;
      const justSettled = settled && state.logicalMs - cell.settleAt < 160;

      drawAtlasDigit(
        cell.currentValue,
        cell.x,
        cell.y,
        justSettled ? 2 : settled ? 1 : 3,
        settled ? 0.97 : 0.82,
        settled ? 0.98 : 0.94
      );
    }

    const pulse = options.noMotion
      ? 1
      : 0.96 + Math.sin(nowPerf * 0.008) * 0.025;

    for (const cell of CF.colonCells) {
      const age = state.logicalMs - cell.settleAt;
      const size = age >= 0 && age < 140 ? 1.04 : 0.94 * pulse;
      drawAtlasDigit(cell.value, cell.x, cell.y, 2, 0.90, size);
    }
  }

  function drawProgress(state) {
    const y = c.LOGICAL_H - 12;
    const progress = Math.max(
      0,
      Math.min(1, state.minuteProgressMs / 60000)
    );

    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    ctx.fillRect(0, y, c.LOGICAL_W, 1);
    ctx.fillStyle = colours.green;
    ctx.fillRect(0, y, c.LOGICAL_W * progress, 2);
  }

  function updateStatus(state) {
    if (state.second === lastAnnouncedSecond) return;
    lastAnnouncedSecond = state.second;
    status.textContent =
      `Melbourne time ${state.clock.slice(0, 2)}:` +
      `${state.clock.slice(2, 4)}:${state.clock.slice(4, 6)}`;
  }

  function publishQc(state) {
    const byDigit = Array.from({ length: 6 }, (_, index) => {
      const cells = CF.digitCells.filter(
        (cell) => cell.digitIndex === index && cell.active
      );
      const unsettled = cells.filter(
        (cell) => state.logicalMs < cell.settleAt
      ).length;
      return {
        active: cells.length,
        unsettled,
        settled: cells.length - unsettled
      };
    });

    window.__COUNTER_FIELD_QC__ = {
      clock: state.clock,
      byDigit,
      dimensions: {
        stage: [c.STAGE_W, c.STAGE_H],
        grid: [c.DIGIT_COLS, c.DIGIT_ROWS]
      },
      digitGapCells: c.DIGIT_GAP / c.CELL_X,
      clockY: c.CLOCK_Y,
      digitHeight: c.DIGIT_H,
      colonValues: CF.colonCells.map((cell) => cell.value),
      fonts: {
        serif: 'PT Serif 700',
        sans: 'Open Sans 400'
      }
    };
  }

  function frame(nowPerf) {
    if (!pageVisible) {
      requestAnimationFrame(frame);
      return;
    }

    if (lastFrameAt && nowPerf - lastFrameAt < c.FRAME_MS - 1) {
      requestAnimationFrame(frame);
      return;
    }
    lastFrameAt = nowPerf;

    const state = CF.getClockState(CF.getNow(nowPerf));
    CF.updateCells(state, nowPerf);
    drawBackground(nowPerf, state);
    drawClock(nowPerf, state);
    drawProgress(state);
    updateStatus(state);
    publishQc(state);

    requestAnimationFrame(frame);
  }

  function initialise() {
    CF.fitStage(viewport, stage);
    window.addEventListener(
      'resize',
      () => CF.fitStage(viewport, stage),
      { passive: true }
    );
    document.addEventListener('visibilitychange', () => {
      pageVisible = !document.hidden;
      if (pageVisible) lastFrameAt = 0;
    });

    const start = () => {
      atlas = createAtlas();
      requestAnimationFrame(frame);
    };

    if (document.fonts) {
      Promise.all([
        document.fonts.load('700 14px "PT Serif"'),
        document.fonts.load('400 10px "Open Sans"'),
        document.fonts.ready
      ]).then(start).catch(start);
    } else {
      window.setTimeout(start, 120);
    }
  }

  initialise();
})();
