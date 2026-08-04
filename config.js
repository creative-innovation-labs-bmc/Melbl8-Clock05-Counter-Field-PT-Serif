(() => {
  'use strict';

  const CF = window.CounterField = window.CounterField || {};

  const constants = {
    STAGE_W: 3840,
    STAGE_H: 804,
    LOGICAL_W: 1920,
    LOGICAL_H: 402,
    TIME_ZONE: 'Australia/Melbourne',
    FPS: 18,
    DIGIT_COLS: 15,
    DIGIT_ROWS: 17,
    CELL_X: 13,
    CELL_Y: 15,
    PAIR_GAP: 52,
    FRAME_TOP: 44,
    FRAME_BOTTOM: 354
  };

  constants.FRAME_MS = 1000 / constants.FPS;
  constants.DIGIT_W = (constants.DIGIT_COLS - 1) * constants.CELL_X;
  constants.DIGIT_H = (constants.DIGIT_ROWS - 1) * constants.CELL_Y;
  constants.DIGIT_GAP = constants.CELL_X * 2;
  constants.COLON_COLS = 3;
  constants.COLON_W = (constants.COLON_COLS - 1) * constants.CELL_X;
  constants.CLOCK_Y = Math.round(
    constants.FRAME_TOP +
    ((constants.FRAME_BOTTOM - constants.FRAME_TOP) - constants.DIGIT_H) / 2
  );

  const colours = {
    bg: '#1C1B1C',
    grey: '#373A36',
    grey2: '#4E5859',
    green: '#89C925',
    white: '#FFFFFF'
  };

  const digitMasks = {"0":["...............",".....#####.....","...#########...","..####...####..","..####...####..",".####.....####.",".####.....####.",".####.....####.",".####.....####.",".####.....####.",".####.....####.",".####.....####.",".####.....####.","..####...####..","..####...####..","...#########...",".....#####....."],"1":["...............","........##.....",".....#####.....","...#######.....","......####.....","......####.....","......####.....","......####.....","......####.....","......####.....","......####.....","......####.....","......####.....","......####.....",".....#####.....","...#########...","...#########..."],"2":["...............","....######.....","..##########...","..###...#####..","..###....####..","..###....####..","...#.....####..","........####...","........####...",".......####....","......####.....",".....####..##..","....###....##..","...##########..",".############..",".############..",".############.."],"3":["...............","..###########..","..###########..","..###########..","..###...####...","..##....###....",".......###.....","......###......",".....#######...",".....########..",".........####..",".........#####.",".........#####.","..##.....####..","..####..#####..","..##########...","....######....."],"4":["...............",".........###...","........####...",".......#####...",".......#####...","......######...",".....#######...","....########...","...###.#####...","..###..#####...",".###...#####...","###############","###############",".......#####...",".......#####...",".....########..",".....########.."],"5":["...........##..","....#########..","....#########..","...##########..","...###.........","...##..........","...##..........","...########....","...#########...","...##########..","........#####..",".........####..",".........####..","..##.....####..",".####..#####...",".##########....","...######......"],"6":["...............",".........###...",".......#####...",".....#####.....","....####.......","...####........","..####.........","..####.####....",".############..",".#####...#####.",".#####...#####.",".####.....####.",".#####....####.","..####...#####.","..#####..####..","...#########...",".....#####....."],"7":["...............","..############.",".#############.","..###########..","..###.....##...","..##.....###...","........###....","........###....",".......###.....",".......###.....","......###......","......###......",".....####......",".....####......","....####.......","....####.......","....####......."],"8":["...............",".....######....","...#########...","..####...####..","..####...####..","..####...####..","..#####..####..","...#########...","....#######....","...#########...","..####.######..",".####....#####.",".####.....####.",".####.....####.",".#####...####..","..##########...","....######....."],"9":["...............",".....#####.....","...#########...","..####...####..",".#####...#####.",".#####...#####.",".#####....####.",".#####....####.","..#####..#####.","..############.","....#########..",".........####..","........####...",".......####....","......####.....","...######......","...###........."]};

  const params = new URLSearchParams(window.location.search);
  const qualityParam = params.get('quality');
  const options = {
    renderScale: qualityParam === 'high' ? 2 : qualityParam === 'low' ? 0.75 : 1,
    demoMode: params.get('demo') === '1',
    previewMode: params.get('preview') === '1',
    noMotion: params.get('motion') === '0' ||
      (window.matchMedia &&
       window.matchMedia('(prefers-reduced-motion: reduce)').matches),
    fixedTime: parseFixedTime(params.get('time'))
  };

  if (options.previewMode) {
    document.documentElement.classList.add('preview');
  }

  const timeFormatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: constants.TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23'
  });

  const dayFormatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: constants.TIME_ZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'short'
  });

  function parseFixedTime(value) {
    if (!value || !/^\d{2}:\d{2}:\d{2}$/.test(value)) return null;
    const [hour, minute, second] = value.split(':').map(Number);
    if (hour > 23 || minute > 59 || second > 59) return null;
    return { hour, minute, second };
  }

  function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function buildDigitLayout() {
    const c = constants;
    const widths = [
      c.DIGIT_W, c.DIGIT_W, c.COLON_W,
      c.DIGIT_W, c.DIGIT_W, c.COLON_W,
      c.DIGIT_W, c.DIGIT_W
    ];
    const gaps = [
      c.DIGIT_GAP, c.PAIR_GAP, c.PAIR_GAP,
      c.DIGIT_GAP, c.PAIR_GAP, c.PAIR_GAP,
      c.DIGIT_GAP
    ];
    const total = widths.reduce((sum, width) => sum + width, 0) +
      gaps.reduce((sum, gap) => sum + gap, 0);
    let x = (c.LOGICAL_W - total) / 2;
    const items = [];

    for (let index = 0; index < widths.length; index++) {
      items.push({
        type: index === 2 || index === 5 ? 'colon' : 'digit',
        x,
        width: widths[index]
      });
      x += widths[index] + (gaps[index] || 0);
    }

    return items;
  }

  function fitStage(viewport, stage) {
    const c = constants;
    const width = window.innerWidth;
    const reservedBottom = options.previewMode ? 48 : 0;
    const availableHeight = Math.max(1, window.innerHeight - reservedBottom);
    const scale = Math.min(width / c.STAGE_W, availableHeight / c.STAGE_H);
    const displayedWidth = c.STAGE_W * scale;
    const displayedHeight = c.STAGE_H * scale;
    const left = Math.max(0, (width - displayedWidth) / 2);
    const top = options.previewMode
      ? Math.max(12, Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--safe-top')
        ) || 12)
      : Math.max(0, (window.innerHeight - displayedHeight) / 2);

    stage.style.left = `${left}px`;
    stage.style.top = `${top}px`;
    stage.style.transform = `scale(${scale})`;
    viewport.style.width = `${window.innerWidth}px`;
    viewport.style.height = `${window.innerHeight}px`;
  }

  Object.assign(CF, {
    constants,
    colours,
    digitMasks,
    options,
    timeFormatter,
    dayFormatter,
    seededRandom,
    buildDigitLayout,
    fitStage
  });
})();
