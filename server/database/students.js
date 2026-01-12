const students = [
  {
    RegNO: "RA2311030010001",
    Name: "GAURAV MISHRA",
    Semester: "III",
    Section: "X1",
    Specialization: "Cyber Security",
    "Phone number": "8429437255",
    "Email address": "gm6674@srmist.edu.in"
  },
  {
    RegNO: "RA2311030010002",
    Name: "BATTI SREE DATHA KOWSHIK",
    Semester: "III",
    Section: "X1",
    Specialization: "Cyber Security",
    "Phone number": "6304569288",
    "Email address": "sb3110@srmist.edu.in"
  },
  {
    RegNO: "RA2311030010003",
    Name: "R MOHAMED FAAHIM",
    Semester: "III",
    Section: "X1",
    Specialization: "Cyber Security",
    "Phone number": "9361182226",
    "Email address": "mf0738@srmist.edu.in"
  },
  {
    RegNO: "RA2311030010004",
    Name: "G S SONAL",
    Semester: "III",
    Section: "X1",
    Specialization: "Cyber Security",
    "Phone number": "8578996138",
    "Email address": "gs5063@srmist.edu.in"
  },
  {
    RegNO: "RA2311030010005",
    Name: "HIMESH POTRU",
    Semester: "III",
    Section: "X1",
    Specialization: "Cyber Security",
    "Phone number": "7981808736",
    "Email address": "hp8886@srmist.edu.in"
  },
  {
    RegNO: "RA2311030010006",
    Name: "JAYAVARAM LAKSHMI RANGA KAVITHA SREE",
    Semester: "III",
    Section: "X1",
    Specialization: "Cyber Security",
    "Phone number": "8247051243",
    "Email address": "lj6237@srmist.edu.in"
  },
  {
    RegNO: "RA2311030010007",
    Name: "SANIKOMMU SHARATH CHANDRA REDDY",
    Semester: "III",
    Section: "X1",
    Specialization: "Cyber Security",
    "Phone number": "6305231775",
    "Email address": "sg9686@srmist.edu.in"
  },
  {
    RegNO: "RA2311030010008",
    Name: "GOLLACHENNU POOJITHA",
    Semester: "III",
    Section: "X1",
    Specialization: "Cyber Security",
    "Phone number": "9182526629",
    "Email address": "pg3579@srmist.edu.in"
  },
  {
    RegNO: "RA2311030010009",
    Name: "HARI VIGANESH U R",
    Semester: "III",
    Section: "X1",
    Specialization: "Cyber Security",
    "Phone number": "7598631806",
    "Email address": "hu7224@srmist.edu.in"
  },
  {
    RegNO: "RA2311030010010",
    Name: "G BHARGAV RAM",
    Semester: "III",
    Section: "X1",
    Specialization: "Cyber Security",
    "Phone number": "7075794026",
    "Email address": "bg8264@srmist.edu.in"
  },
  {
    RegNO: "RA2211028010208",
    Name: "AADITYA SINGH JAT",
    Semester: "IV",
    Section: "Q2",
    Specialization: "CS Cloud Computing",
    "Phone number": "7974847772",
    "Email address": "aj5973@srmist.edu.in"
  },
  {
    RegNO: "RA2211028010210",
    Name: "SHAURYA CHOUDHA",
    Semester: "IV",
    Section: "Q2",
    Specialization: "CS Cloud Computing",
    "Phone number": "7999312411",
    "Email address": "sc8239@srmist.edu.in"
  },
  {
    RegNO: "RA2211028010214",
    Name: "ANIRUDDH SINGH",
    Semester: "IV",
    Section: "Q2",
    Specialization: "CS Cloud Computing",
    "Phone number": "9555634056",
    "Email address": "as2197@srmist.edu.in"
  },
  {
    RegNO: "RA2211028010221",
    Name: "LUVNEET VERMA",
    Semester: "IV",
    Section: "Q2",
    Specialization: "CS Cloud Computing",
    "Phone number": "8905688106",
    "Email address": "lv2369@srmist.edu.in"
  },
  {
    RegNO: "RA2211028010223",
    Name: "MINHAJ MUNAWAR KHAN",
    Semester: "IV",
    Section: "Q2",
    Specialization: "CS Cloud Computing",
    "Phone number": "8899634235",
    "Email address": "mk6224@srmist.edu.in"
  },
  {
    RegNO: "RA2211028010233",
    Name: "AMAN KUMAR",
    Semester: "IV",
    Section: "Q2",
    Specialization: "CS Cloud Computing",
    "Phone number": "9771522903",
    "Email address": "ak0115@srmist.edu.in"
  },
  {
    RegNO: "RA2211028010140",
    Name: "PRANJALI SRIVASTAVA",
    Semester: "IV",
    Section: "P2",
    Specialization: "CS Cloud Computing",
    "Phone number": "8355022995",
    "Email address": "ps5569@srmist.edu.in"
  },
  {
    RegNO: "RA2211028010141",
    Name: "VIHAAN GAUTAM",
    Semester: "IV",
    Section: "P2",
    Specialization: "CS Cloud Computing",
    "Phone number": "8777672693",
    "Email address": "vg3130@srmist.edu.in"
  },
  {
    RegNO: "RA2211028010151",
    Name: "KURMADASU ABHIRAM",
    Semester: "IV",
    Section: "P2",
    Specialization: "CS Cloud Computing",
    "Phone number": "8121482004",
    "Email address": "ak0252@srmist.edu.in"
  },
  {
    RegNO: "RA2211028010153",
    Name: "ANNAM PANNAGA SAI",
    Semester: "IV",
    Section: "P2",
    Specialization: "CS Cloud Computing",
    "Phone number": "8106626973",
    "Email address": "pa8007@srmist.edu.in"
  },
  {
    RegNO: "RA2211028010164",
    Name: "VED GANESH JADHAV",
    Semester: "IV",
    Section: "P2",
    Specialization: "CS Cloud Computing",
    "Phone number": "7620768270",
    "Email address": "vj3966@srmist.edu.in"
  },
  {
    RegNO: "RA2211028010172",
    Name: "GONGADA BHARGAVA NAIDU",
    Semester: "IV",
    Section: "P2",
    Specialization: "CS Cloud Computing",
    "Phone number": "9346702020",
    "Email address": "bg3270@srmist.edu.in"
  },
  {
    RegNO: "RA2211028010180",
    Name: "YUVRAJ SHAW",
    Semester: "IV",
    Section: "P2",
    Specialization: "CS Cloud Computing",
    "Phone number": "7432958011",
    "Email address": "ys7061@srmist.edu.in"
  },
  {
    RegNO: "RA2211028010186",
    Name: "RANGINENI ANIL KUMAR",
    Semester: "IV",
    Section: "P2",
    Specialization: "CS Cloud Computing",
    "Phone number": "7989596972",
    "Email address": "ar4167@srmist.edu.in"
  },
  {
    RegNO: "RA2411029010028",
    Name: "NARAYAN PARASHER",
    Semester: "II",
    Section: "X2",
    Specialization: "CS CN",
    "Phone number": "9810557288",
    "Email address": "parasher.abhishek@gmail.com"
  },
  {
    RegNO: "RA2411029010029",
    Name: "KANKIPATI KEERTHI SARANYA",
    Semester: "II",
    Section: "X2",
    Specialization: "CS CN",
    "Phone number": "8374297499",
    "Email address": "raviitc.kankipati@gmail.com"
  },
  {
    RegNO: "RA2411029010030",
    Name: "ADITYA SINGH",
    Semester: "II",
    Section: "X2",
    Specialization: "CS CN",
    "Phone number": "7856848441",
    "Email address": "amit.kr0501@gmail.com"
  },
  {
    RegNO: "RA2411029010031",
    Name: "MISHU KUMAR",
    Semester: "II",
    Section: "X2",
    Specialization: "CS CN",
    "Phone number": "8252623033",
    "Email address": "mishuranjan1947@gmail.com"
  },
  {
    RegNO: "RA2411029010032",
    Name: "MAYANK KUMAR",
    Semester: "II",
    Section: "X2",
    Specialization: "CS CN",
    "Phone number": "7404789769",
    "Email address": "skcssri72@gmail.com"
  },
  {
    RegNO: "RA2411029010033",
    Name: "LAKSHIKA",
    Semester: "II",
    Section: "X2",
    Specialization: "CS CN",
    "Phone number": "9360752177",
    "Email address": "gplcommunication032@gmail.com"
  },
  {
    RegNO: "RA2411029010034",
    Name: "SRIRANGAM LEELA SAI KRISHNA",
    Semester: "II",
    Section: "X2",
    Specialization: "CS CN",
    "Phone number": "8309376181",
    "Email address": "gnanasundaram349@gmail.com"
  },
  {
    RegNO: "RA2411029010035",
    Name: "RISHIKESH PK",
    Semester: "II",
    Section: "X2",
    Specialization: "CS CN",
    "Phone number": "9345692832",
    "Email address": "ravisanthi9290@gmail.com"
  },
  {
    RegNO: "RA2411029010036",
    Name: "FEBA MARIAM LUKE",
    Semester: "II",
    Section: "X2",
    Specialization: "CS CN",
    "Phone number": "7592997312",
    "Email address": "ancheriluke55@gmail.com"
  },
  {
    RegNO: "RA2411029010037",
    Name: "ARNAV C",
    Semester: "II",
    Section: "X2",
    Specialization: "CS CN",
    "Phone number": "9903531368",
    "Email address": "vasan13.sreen@gmail.com"
  }
];

module.exports = students;
