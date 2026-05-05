const attendance = [
  // RC1328 - Yashwant Kashinath Ghanekar
  { code:"RC1328", date:"9/20/2025", day:"Sat", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:02 AM", exit:"07:03 PM", status:"DP"     },
  { code:"RC1328", date:"9/19/2025", day:"Fri", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:05 AM", exit:"07:01 PM", status:"DP"     },
  { code:"RC1328", date:"9/18/2025", day:"Thu", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:01 AM", exit:"07:10 PM", status:"DP"     },
  { code:"RC1328", date:"9/17/2025", day:"Wed", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:00 AM", exit:"07:00 PM", status:"DP"     },
  { code:"RC1328", date:"9/16/2025", day:"Tue", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:03 AM", exit:"07:05 PM", status:"DP"     },
  { code:"RC1328", date:"9/15/2025", day:"Mon", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:00 AM", exit:"07:00 PM", status:"DP"     },
  { code:"RC1328", date:"9/14/2025", day:"Sun", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"--",       exit:"--",       status:"WO"     },
  { code:"RC1328", date:"9/13/2025", day:"Sat", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:07 AM", exit:"07:02 PM", status:"DP"     },
  { code:"RC1328", date:"9/12/2025", day:"Fri", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:04 AM", exit:"07:00 PM", status:"DP"     },
  { code:"RC1328", date:"9/11/2025", day:"Thu", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"--",       exit:"--",       status:"PL"     },
  { code:"RC1328", date:"9/10/2025", day:"Wed", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:02 AM", exit:"07:03 PM", status:"DP"     },
  { code:"RC1328", date:"9/9/2025",  day:"Tue", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:01 AM", exit:"07:05 PM", status:"DP"     },
  { code:"RC1328", date:"9/8/2025",  day:"Mon", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:06 AM", exit:"07:01 PM", status:"DP"     },
  { code:"RC1328", date:"9/7/2025",  day:"Sun", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"--",       exit:"--",       status:"WO"     },
  { code:"RC1328", date:"9/6/2025",  day:"Sat", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:00 AM", exit:"07:00 PM", status:"DP"     },
  { code:"RC1328", date:"9/5/2025",  day:"Fri", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:03 AM", exit:"07:04 PM", status:"DP"     },
  { code:"RC1328", date:"9/4/2025",  day:"Thu", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:02 AM", exit:"07:00 PM", status:"DP"     },
  { code:"RC1328", date:"9/3/2025",  day:"Wed", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:01 AM", exit:"07:02 PM", status:"DP"     },
  { code:"RC1328", date:"9/2/2025",  day:"Tue", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:05 AM", exit:"07:01 PM", status:"DP"     },
  { code:"RC1328", date:"9/1/2025",  day:"Mon", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"--",       exit:"--",       status:"PH"     },
  { code:"RC1328", date:"9/21/2025", day:"Sun", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"--",       exit:"--",       status:"WO"     },
  { code:"RC1328", date:"9/22/2025", day:"Mon", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:10 AM", exit:"07:00 PM", status:"DP"     },
  { code:"RC1328", date:"9/23/2025", day:"Tue", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"--",       exit:"--",       status:"ABS/DP" },
  { code:"RC1328", date:"9/24/2025", day:"Wed", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:02 AM", exit:"07:03 PM", status:"DP"     },
  { code:"RC1328", date:"9/25/2025", day:"Thu", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:00 AM", exit:"07:00 PM", status:"DP"     },
  { code:"RC1328", date:"9/26/2025", day:"Fri", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:04 AM", exit:"07:05 PM", status:"DP/ABS" },
  { code:"RC1328", date:"9/27/2025", day:"Sat", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:01 AM", exit:"07:02 PM", status:"DP"     },
  { code:"RC1328", date:"9/28/2025", day:"Sun", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"--",       exit:"--",       status:"WO"     },
  { code:"RC1328", date:"9/29/2025", day:"Mon", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:02 AM", exit:"07:03 PM", status:"DP"     },
  { code:"RC1328", date:"9/30/2025", day:"Tue", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:00 AM", exit:"07:01 PM", status:"DP"     },

  // RC1773 - Samir Sadhan Adhikary
  { code:"RC1773", date:"9/19/2025", day:"Fri", shiftIn:"09:30 AM", shiftOut:"06:30 PM", entry:"12:57 PM", exit:"10:06 PM", status:"DP"     },
  { code:"RC1773", date:"9/20/2025", day:"Sat", shiftIn:"09:30 AM", shiftOut:"06:30 PM", entry:"09:35 AM", exit:"06:31 PM", status:"DP"     },
  { code:"RC1773", date:"9/18/2025", day:"Thu", shiftIn:"09:30 AM", shiftOut:"06:30 PM", entry:"09:30 AM", exit:"06:30 PM", status:"DP"     },
  { code:"RC1773", date:"9/17/2025", day:"Wed", shiftIn:"09:30 AM", shiftOut:"06:30 PM", entry:"--",       exit:"--",       status:"PL"     },
  { code:"RC1773", date:"9/16/2025", day:"Tue", shiftIn:"09:30 AM", shiftOut:"06:30 PM", entry:"09:32 AM", exit:"06:32 PM", status:"DP"     },
  { code:"RC1773", date:"9/15/2025", day:"Mon", shiftIn:"09:30 AM", shiftOut:"06:30 PM", entry:"09:31 AM", exit:"06:30 PM", status:"DP"     },
  { code:"RC1773", date:"9/14/2025", day:"Sun", shiftIn:"09:30 AM", shiftOut:"06:30 PM", entry:"--",       exit:"--",       status:"WO"     },
  { code:"RC1773", date:"9/13/2025", day:"Sat", shiftIn:"09:30 AM", shiftOut:"06:30 PM", entry:"09:30 AM", exit:"06:35 PM", status:"DP"     },
  { code:"RC1773", date:"9/12/2025", day:"Fri", shiftIn:"09:30 AM", shiftOut:"06:30 PM", entry:"09:33 AM", exit:"06:30 PM", status:"DP"     },
  { code:"RC1773", date:"9/11/2025", day:"Thu", shiftIn:"09:30 AM", shiftOut:"06:30 PM", entry:"--",       exit:"--",       status:"ABS"    },
  { code:"RC1773", date:"9/10/2025", day:"Wed", shiftIn:"09:30 AM", shiftOut:"06:30 PM", entry:"09:30 AM", exit:"06:30 PM", status:"DP"     },
  { code:"RC1773", date:"9/30/2025", day:"Tue", shiftIn:"09:30 AM", shiftOut:"06:30 PM", entry:"09:30 AM", exit:"06:30 PM", status:"DP"     },

  // RC1095 - Zafar Abdukkhalique Khan
  { code:"RC1095", date:"9/20/2025", day:"Sat", shiftIn:"08:00 AM", shiftOut:"05:00 PM", entry:"08:02 AM", exit:"05:05 PM", status:"DP"     },
  { code:"RC1095", date:"9/19/2025", day:"Fri", shiftIn:"08:00 AM", shiftOut:"05:00 PM", entry:"08:05 AM", exit:"05:00 PM", status:"DP"     },
  { code:"RC1095", date:"9/18/2025", day:"Thu", shiftIn:"08:00 AM", shiftOut:"05:00 PM", entry:"--",       exit:"--",       status:"PL"     },
  { code:"RC1095", date:"9/17/2025", day:"Wed", shiftIn:"08:00 AM", shiftOut:"05:00 PM", entry:"08:00 AM", exit:"05:02 PM", status:"DP"     },
  { code:"RC1095", date:"9/30/2025", day:"Tue", shiftIn:"08:00 AM", shiftOut:"05:00 PM", entry:"08:01 AM", exit:"05:00 PM", status:"DP"     },

  // RC1012 - Ramesh Bhau Patil
  { code:"RC1012", date:"9/30/2025", day:"Tue", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"09:02 AM", exit:"06:03 PM", status:"DP"     },
  { code:"RC1012", date:"9/29/2025", day:"Mon", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"09:00 AM", exit:"06:01 PM", status:"DP"     },
  { code:"RC1012", date:"9/28/2025", day:"Sun", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"--",       exit:"--",       status:"WO"     },
  { code:"RC1012", date:"9/27/2025", day:"Sat", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"09:05 AM", exit:"06:00 PM", status:"DP"     },
  { code:"RC1012", date:"9/26/2025", day:"Fri", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"--",       exit:"--",       status:"PL"     },

  // RC1045 - Suresh Kumar Verma
  { code:"RC1045", date:"9/30/2025", day:"Tue", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"09:01 AM", exit:"06:00 PM", status:"DP"     },
  { code:"RC1045", date:"9/29/2025", day:"Mon", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"09:03 AM", exit:"06:05 PM", status:"DP"     },
  { code:"RC1045", date:"9/28/2025", day:"Sun", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"--",       exit:"--",       status:"WO"     },

  // RC1156 - Priya Manoj Shah
  { code:"RC1156", date:"9/30/2025", day:"Tue", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"09:00 AM", exit:"06:02 PM", status:"DP"     },
  { code:"RC1156", date:"9/29/2025", day:"Mon", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"--",       exit:"--",       status:"ABS"    },

  // RC1204 - Anjali Rakesh Mehta
  { code:"RC1204", date:"9/30/2025", day:"Tue", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"09:02 AM", exit:"06:00 PM", status:"DP"     },
  { code:"RC1204", date:"9/29/2025", day:"Mon", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"09:04 AM", exit:"06:03 PM", status:"DP"     },

  // RC1267 - Mohammed Salim Ansari
  { code:"RC1267", date:"9/30/2025", day:"Tue", shiftIn:"08:30 AM", shiftOut:"05:30 PM", entry:"08:31 AM", exit:"05:31 PM", status:"DP"     },
  { code:"RC1267", date:"9/29/2025", day:"Mon", shiftIn:"08:30 AM", shiftOut:"05:30 PM", entry:"08:30 AM", exit:"05:33 PM", status:"DP"     },

  // RC1301 - Kavita Vijay Joshi
  { code:"RC1301", date:"9/30/2025", day:"Tue", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"09:05 AM", exit:"06:00 PM", status:"DP"     },
  { code:"RC1301", date:"9/29/2025", day:"Mon", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"--",       exit:"--",       status:"PH"     },

  // RC1340 - Dinesh Shankar Yadav
  { code:"RC1340", date:"9/30/2025", day:"Tue", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"09:00 AM", exit:"06:02 PM", status:"DP"     },

  // RC1382 - Nilesh Prakash Sawant
  { code:"RC1382", date:"9/30/2025", day:"Tue", shiftIn:"08:30 AM", shiftOut:"05:30 PM", entry:"08:32 AM", exit:"05:30 PM", status:"DP"     },

  // RC1420 - Sunita Ashok Pawar
  { code:"RC1420", date:"9/30/2025", day:"Tue", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"09:01 AM", exit:"06:01 PM", status:"DP"     },

  // RC1455 - Deepak Narayan Kulkarni
  { code:"RC1455", date:"9/30/2025", day:"Tue", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"--",       exit:"--",       status:"ABS"    },

  // RC1488 - Sanjay Ratan Gupta
  { code:"RC1488", date:"9/30/2025", day:"Tue", shiftIn:"09:30 AM", shiftOut:"06:30 PM", entry:"09:30 AM", exit:"06:30 PM", status:"DP"     },

  // RC1512 - Rekha Sunil Desai
  { code:"RC1512", date:"9/30/2025", day:"Tue", shiftIn:"09:00 AM", shiftOut:"07:00 PM", entry:"09:03 AM", exit:"07:00 PM", status:"DP"     },

  // RC1543 - Amol Ganesh Shinde
  { code:"RC1543", date:"9/30/2025", day:"Tue", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"09:02 AM", exit:"06:04 PM", status:"DP"     },

  // RC1567 - Pooja Ramesh Naik
  { code:"RC1567", date:"9/30/2025", day:"Tue", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"--",       exit:"--",       status:"PL"     },

  // RC1601 - Kiran Dattatray More
  { code:"RC1601", date:"9/30/2025", day:"Tue", shiftIn:"08:30 AM", shiftOut:"05:30 PM", entry:"08:33 AM", exit:"05:32 PM", status:"DP"     },

  // RC1634 - Seema Arun Jadhav
  { code:"RC1634", date:"9/30/2025", day:"Tue", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"09:01 AM", exit:"06:00 PM", status:"DP"     },

  // RC1672 - Vijay Santosh Bhosle
  { code:"RC1672", date:"9/30/2025", day:"Tue", shiftIn:"09:00 AM", shiftOut:"06:00 PM", entry:"09:00 AM", exit:"06:01 PM", status:"DP"     },
];

module.exports = attendance;
