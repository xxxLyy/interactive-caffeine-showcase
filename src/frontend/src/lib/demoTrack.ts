import type { Track } from "./tracks";
import {
  type SongAnalysis,
  type UserTrackRecord,
  arrangeUserTrack,
} from "./userTracks";

/** Stable id of the built-in demo; user uploads always start with "user-". */
export const DEMO_ID = "demo-track";

/*
 * Precomputed with analyzeSong() on /assets/audio/demo.mp3 in Chromium, so the
 * demo is ready instantly and never depends on localStorage.
 * Encoding: each 0–1 value is round(v * 1000) as two base-36 chars;
 * melody is one char per 16th step, "." unvoiced, else MIDI = 40 + index in MEL.
 */
const CHROMA = [
  "hoe2mhi3p8ltnqpkptrso4pu",
  "ese4lufzlhjpomlplursmwnh",
  "hadekqg0mbkjmontosrsnop6",
  "cjc0icduk8hpkridj8rsnzkg",
  "hsebm0hvoplon7p7parsn9pm",
  "f5e5magdmnjsnolomcrsnuot",
  "j0evlag9o4n5odppqcrspmr3",
  "endskbfglck2m4lkjursp5l5",
  "gzfhjffil1msrsoilemol9ly",
  "i0fklqgdmnngrsomn6r8ovo7",
  "ldg7l7ieplq8pzq0plrsnyog",
  "k5hdmcglmup7rsqpp5rropov",
  "hqf5k5haoon5rmrsqpqwozo4",
  "gjgnkrh3lelirsmollnun8m6",
  "jvh0kvhhozniriqrrgrspzqu",
  "hugvmmi6n0map6ngoirnrsq1",
  "iofql1g8mnp2rsrpngp2n8mq",
  "f4f9m5g2lflkrspmnqp8mpmo",
  "jwikktgtn1mkrsrjplq0pep6",
  "gzhjkfemmumtqdmwmarspcl2",
  "grewkag6m5mzqzrsmmohmvmr",
  "h2gwl8f6lnmarsolnwrrp5p2",
  "iifrmzhunko1qmqmpsrsq5q3",
  "evf2l6gkmrmfp6oin3rso9lf",
  "hcgqkbhamalirsr0opqhnoma",
  "i5hemsgdlhnvrspiosqtpcp4",
  "j4g4m5h8mwnfq9qyqrrsp2p9",
  "geghm9fylilfrqp0pvrspjov",
  "g9d9lxg2l4iylllglyrsmtri",
  "i0e4kyfjmfjwmqkpl1rsogq1",
  "kmcui8ekjaidlbmdlwotn5rs",
  "fqbogud6j9h2kojcixrspbox",
  "iicmikg9mlk1o6paoursnkr7",
  "gfcmineijrhulfjtkcptqhrs",
  "g4bfi6etj6i9lzo4nrpmncrs",
  "g3c7hue4l0ioldjgj2rsp7pi",
  "gndnkdjwrsk1lsmyniq3qsr0",
  "hsh8lqj4ocnhrrofmxr9rsp6",
  "k4gmksk0prqkqtrcqursqzp8",
  "dxd3iofol1jhmemglcrsopl5",
  "i0fbkugwpaofrsqyp7q2p4p1",
  "gcfemnhwnvnhrsq5p0raq2oj",
  "iffwktgvmtn2rsrfo1r4q0nw",
  "gaevizf5mplbnhkyl2rsp6mk",
  "j2fylrhpp4osrspxoepionog",
  "gyeskthao3lgp7oarkrsodok",
  "ilhalthen0pgrsohnnr3nznz",
  "fff7jsf1m0mcq6ncmrrsozl8",
  "jfgblrjdpnnlqqrsqbr4ompm",
  "g4f1l9h3ohmxq8p4omrso9p9",
  "kbh2l4ier8qzrsq9peqlowoz",
  "i5gml6hrq9qbrsojodreqkpq",
  "irfnmiiwpwo6p0rsrfrkpxqv",
  "h4g1kkgmownmrsnmnyrapbnw",
  "kmfiljhsr1qarsrlqfr2prqi",
  "j1gqmdfypdo8rsqdpirdqhqs",
  "jbelkzhgnen4qjnwn9ogp0rs",
  "jbhbniihoiobrhoionrsp7ov",
  "hidzlkilq3oqpmpdqorsqoqf",
  "hfgjmqidqbodr4nhmbrsq1o7",
  "iffijth2oooersq5ompgn0mj",
  "fke2lxgyn2mtq4ospersognm",
  "hnfdlsjwpjoeq4pkocrsptoo",
  "ekctixfgonlom2kxmbrspslx",
  "g6d8lvg2l3j2lrktlursmprb",
  "iyeqk9fumdlwowl6larso9pi",
  "kld3hwewjohzl5mmm2ouo5rs",
  "gscihtdml7hykojqjnrspdp8",
  "itddjmglmwkdo0pbogrsnkr6",
  "gzcdirezjsihlojik9pqqprs",
  "gdbridg5jticlco8nrpantrs",
  "g7cqjaebkdhvkxjdj7rspppj",
  "gjdam1g9lij3lvl4lzrmn7rs",
  "j1f0kdgbmqmep5ktldrsoqph",
  "k5cphkerj6hskmlilgopnvrs",
  "fgcuibdsmiicjhlkl8rsoaoi",
  "ise0ihg1lpk3n8mxmqrspip8",
  "fwdmj9g3kmjto3jmjjowphrs",
  "hhcai7f7k5iimgmzmup1nyrs",
  "embkh5dik7hdkiipiorsp6p3",
  "fqdok8ftq3kpnjnio5r6osrs",
  "eyf3m4fklwk6prmimersnoo3",
  "gdeulwh5oklhpbq2pwrso4oo",
  "h2eakrg8lejsoglmlkrsour8",
  "ghdkj4fvrsljm1m7okn4mpp9",
  "ehe2jwhkrsk5lhjtlzn7ovp9",
  "gpfhlujhrsllo6q5pqq6p1pg",
  "fog0n4heobkbpmm1m4rspep3",
  "gijep4j1rsj7q5qokbmzqzpb",
];

const MELODY = [
  ".....FFF........................................................",
  ".....................JJ......................OPF................",
  "...QQF.....FQQFF..QQQFJJJ.QQ.......PPF....FF...FQQQFFH.....FWPLF",
  "O..PWJ...gOQQ....QQQ.FJ.QQG..FF....OFF.....JJ......MJJJ........F",
  "PQW.FFFFFFFFFF.PF.PMQFFQ.FFFFF.........FFQQF...QX....FFFQQQR....",
  ".PFg.FFFFFFFFFFF..QQQHJ.......FFFFFFFFFFFFFF......XFGHHQQFeQ...F",
  "FFQQQFX....FF.QFFFFFFFJQQQ...FFF.GFFFFFF.......FGG.FFQQQ..GM....",
  ".MMMMFJJJJFO.JJHHKJ..HJ.....hJJJJJJJWWJV.......JJJJHFFHT....JJJF",
  "FF.OJJJFFF.HJFHHJJJJJJJJHH.IJJJJFF.JJJJJFFFFGTJJHH...JJJJKKV...P",
  "O..OOO...............JJJ............QFFFFR...........HHG........",
  ".PPFFFF.......OQQQ.GQH..QF.....FF.QFFFFFFFFFQQFO.HHV.HJJ...QQ.PQ",
  "F.QbJOPFFFFFFQQQQQQQGGQQ.......OQQQb.......MF..FFFFFQPX.QG...PF.",
  "PRRPFFFF.VFFFGG.FQQQQJJJ.HOd......OVFFPPPPXFFF.......HJJ.WFQ...P",
  "PG...FFFQ.FF...HN.QQQQQQ............QF.KPOFF.....eeQQHJ...OFIJJJ",
  "JQ.NPF.UV.MKF...FFPGLFJPQQ.....QFF....OO.PPF...QFR...HJQPVV...QQ",
  "QQQP.FFFFFFFFFFFFFFMPHH.........dc....FF.........gVN............",
  ".MMMMFJJJJFO.JJHHKJ..HJJ..iMhJJJJJJJKWJV..UF...JJJKHFFHT..JJJJJJ",
  "FF.MJJJFFF.HJ.HHJJJJJJJJHWWI.JJJFF.hJJJJFFFFGTJJHH...JJJJKKV....",
  ".MMMMFJJJJFO.JJHHKJ..HJ.....hJJJJKKKKWJV.JUF...JJJRRHHJJJJJFFFHH",
  "K....VIHK..FJHHHJJOU.HHHJJJJJJJVFF.JJJJJRF.JFHJJHHHJJJJJJJJJHHFV",
  "VVVVhO.................................................JJJKV....",
  ".........POOOO....OO.HJO..OOOO...............Fa.......JJ........",
  "................",
].join("");

const DRUMS = {
  kick: "lq3e6pjr4b4grs36mb326k56aq34cm43",
  snare: "r4ebbtgirs9qgu9knvdiaygjly7ucjba",
  hat: "jwb4afeqrs7pd29qjgafbfecga68cyag",
};

const MEL = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const unpack = (s: string): number[] =>
  Array.from(
    { length: s.length / 2 },
    (_, i) => Number.parseInt(s.slice(i * 2, i * 2 + 2), 36) / 1000,
  );

export const DEMO_ANALYSIS: SongAnalysis = {
  bpm: 89,
  root: 2,
  mode: "major",
  bars: 89,
  duration: 241.6,
  barChroma: CHROMA.map(unpack),
  melody: Array.from(MELODY, (c) => (c === "." ? null : 40 + MEL.indexOf(c))),
  drums: {
    kick: unpack(DRUMS.kick),
    snare: unpack(DRUMS.snare),
    hat: unpack(DRUMS.hat),
  },
};

export const DEMO_RECORD: UserTrackRecord = {
  id: DEMO_ID,
  name: "共振示范",
  fileName: "demo.mp3",
  createdAt: 0,
  analysis: DEMO_ANALYSIS,
  bpm: 89,
  root: 2,
  mode: "major",
};

/** Built-in, always-present demo: the generated performance of the bundled song. */
export const DEMO_TRACK: Track = {
  ...arrangeUserTrack(DEMO_RECORD).track,
  styleZh: "示范曲目",
  styleEn: "Demo",
};
