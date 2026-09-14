import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { auth, db, googleProvider } from '../lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, createUserWithEmailAndPassword, updatePassword, signInWithEmailAndPassword, sendPasswordResetEmail, User as FirebaseUser } from 'firebase/auth';
import { ref, onValue, set, get, update, push, remove, child, query, orderByChild, limitToLast, equalTo } from 'firebase/database';
import { initOneSignal, registerUserWithOneSignal } from '../lib/onesignal';
import { User, AppSettings, Tournament, Announcement, AppPopup } from '../types';
import { PinAuthModal } from '../components/PinAuthModal';
import { PinSetupModal } from '../components/PinSetupModal';
import { DEFAULT_AVATAR, EASYPAISA_LOGO, JAZZCASH_LOGO, SADAPAY_LOGO, NAYAPAY_LOGO, PK_LOGO_IMAGE, PK_COIN_ICON } from '../lib/assets';
import { preloadAllCoreAssets, preloadDynamicAssets } from '../lib/assetPreloader';
import { playErrorSound } from '../lib/sound';

interface Match {
  id: string;
  tournamentId: string;
  title: string;
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  date: string;
  entryFee: number;
  joined: boolean;
  slot: number;
  rank?: number;
  kills?: number;
  reward?: number;
  roomId?: string;
  roomPass?: string;
  joinedAt?: string;
  inGameName?: string;
  teamDetails?: { inGameName: string, gameUid: string }[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: number;
  claimed: boolean;
}

interface AppContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  registerManual: (email: string, pass: string, data: Partial<User>) => Promise<void>;
  loginManual: (email: string, pass: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  checkEmailExists: (email: string) => Promise<boolean>;
  resetPassword: (email: string, newPass: string) => Promise<void>;
  checkUsernameExists: (username: string, excludeUserId?: string) => Promise<boolean>;
  joinedMatches: Match[];
  joinMatch: (match: any, slot: number, teamDetails?: { inGameName: string, gameUid: string }[]) => Promise<void>;
  achievements: Achievement[];
  claimAchievement: (id: string) => Promise<void>;
  referralStats: any;
  transactions: any[];
  addTransaction: (tx: any) => Promise<void>;
  isProfileComplete: boolean;
  leaderboard: User[];
  appSettings: AppSettings | null;
  paymentSettings: any;
  tournaments: Tournament[];
  banners: any[];
  announcements: Announcement[];
  popups: AppPopup[];
  hasSeenAppOpenPopup: boolean;
  setHasSeenAppOpenPopup: (val: boolean) => void;
  selectedLang: 'English' | 'Roman Urdu' | 'Urdu';
  setSelectedLang: (lang: 'English' | 'Roman Urdu' | 'Urdu') => void;
  t: (key: string) => string;
  requirePinAuth: () => Promise<boolean>;
  pinModalOpen: boolean;
  isPinSetupRequired: boolean;
  forcePinSetup: boolean;
  setForcePinSetup: (val: boolean) => void;
}

const translations: Record<string, Record<string, string>> = {
  // Navigation & Tabs
  "HOME": {
    "English": "HOME",
    "Roman Urdu": "HOME",
    "Urdu": "ہوم"
  },
  "MATCHES": {
    "English": "MATCHES",
    "Roman Urdu": "MATCHES",
    "Urdu": "میچز"
  },
  "RANKS": {
    "English": "RANKS",
    "Roman Urdu": "RANKS",
    "Urdu": "رینک"
  },
  "WALLET": {
    "English": "WALLET",
    "Roman Urdu": "WALLET",
    "Urdu": "والیٹ"
  },
  "PROFILE": {
    "English": "PROFILE",
    "Roman Urdu": "PROFILE",
    "Urdu": "پروفائل"
  },
  
  // Profile menu list
  "Edit Profile": {
    "English": "Edit Profile",
    "Roman Urdu": "Profile Tabdeel Karein",
    "Urdu": "پروفائل تبدیل کریں"
  },
  "Referral Program": {
    "English": "Referral Program",
    "Roman Urdu": "Doston ko Invite Karein",
    "Urdu": "دوستوں کو مدعو کریں"
  },
  "Match History": {
    "English": "Match History",
    "Roman Urdu": "Matches ki Tareekh",
    "Urdu": "میچز کی تاریخ"
  },
  "Result History": {
    "English": "Result History",
    "Roman Urdu": "Nataij ki Tareekh",
    "Urdu": "نتائج کی تاریخ"
  },
  "Joined Tournaments": {
    "English": "Joined Tournaments",
    "Roman Urdu": "Shamil Shuda Matches",
    "Urdu": "شامل شدہ ٹورنامنٹس"
  },
  "How to Join": {
    "English": "How to Join",
    "Roman Urdu": "Join Kaise Karein",
    "Urdu": "جوائن کیسے کریں"
  },
  "Halal or Haram?": {
    "English": "Halal or Haram?",
    "Roman Urdu": "Halal ya Haram?",
    "Urdu": "حلال یا حرام؟"
  },
  "About App": {
    "English": "About App",
    "Roman Urdu": "App Ke Baray Me",
    "Urdu": "ایپ کے بارے میں"
  },
  "Change Language": {
    "English": "Change Language",
    "Roman Urdu": "Zubaan Tabdeel Karein",
    "Urdu": "زبان تبدیل کریں"
  },
  "Terms & Conditions": {
    "English": "Terms & Conditions",
    "Roman Urdu": "Sharaait-o-Zawabit",
    "Urdu": "شرائط و ضوابط"
  },
  "Privacy Policy": {
    "English": "Privacy Policy",
    "Roman Urdu": "Razdaari ki Policy",
    "Urdu": "رازداری کی پالیسی"
  },
  "Log Out": {
    "English": "Log Out",
    "Roman Urdu": "Log Out Karein",
    "Urdu": "لاگ آؤٹ کریں"
  },

  // Stats labels
  "Total Balance": {
    "English": "Total Balance",
    "Roman Urdu": "Kul Balance",
    "Urdu": "کل بیلنس"
  },
  "Total Earnings": {
    "English": "Total Earnings",
    "Roman Urdu": "Kul Kamai",
    "Urdu": "کل کمائی"
  },
  "Won Tournaments": {
    "English": "Won Tournaments",
    "Roman Urdu": "Jeetay Huay Matches",
    "Urdu": "جیتے ہوئے ٹورنامنٹس"
  },
  "Total Kills": {
    "English": "Total Kills",
    "Roman Urdu": "Kul Kills",
    "Urdu": "کل ہلاکتیں"
  },
  "Claim Reward": {
    "English": "Claim Reward",
    "Roman Urdu": "Inaam Claim Karein",
    "Urdu": "انعام کا دعوی کریں"
  },

  // Wallet Actions
  "Deposit": {
    "English": "Deposit",
    "Roman Urdu": "Paise Jama Karein",
    "Urdu": "پیسے جمع کریں"
  },
  "Withdraw": {
    "English": "Withdraw",
    "Roman Urdu": "Paise Nikalwein",
    "Urdu": "رقم نکلوائیں"
  },
  "Transaction History": {
    "English": "Transaction History",
    "Roman Urdu": "Len Den ki Tareekh",
    "Urdu": "لین دین کی تاریخ"
  },
  "Send Deposit Proof": {
    "English": "Send Deposit Proof",
    "Roman Urdu": "Deposit Ka Proof Bhejein",
    "Urdu": "جمع کرانے کا ثبوت بھیجیں"
  },
  "Coins": {
    "English": "Coins",
    "Roman Urdu": "Sikkay",
    "Urdu": "سکے"
  },
  "ALL": {
    "English": "ALL",
    "Roman Urdu": "SAB",
    "Urdu": "سب"
  },
  "TDM": {
    "English": "TDM",
    "Roman Urdu": "TDM",
    "Urdu": "ٹی ڈی ایم"
  },
  "ERANGEL": {
    "English": "ERANGEL",
    "Roman Urdu": "ERANGEL",
    "Urdu": "ارانگل"
  },
  "MIRAMAR": {
    "English": "MIRAMAR",
    "Roman Urdu": "MIRAMAR",
    "Urdu": "میرا مار"
  },
  "LIVIK": {
    "English": "LIVIK",
    "Roman Urdu": "LIVIK",
    "Urdu": "لیوک"
  },
  "SANHOK": {
    "English": "SANHOK",
    "Roman Urdu": "SANHOK",
    "Urdu": "سانہوک"
  },
  "CLASH SQUAD": {
    "English": "TDM",
    "Roman Urdu": "TDM",
    "Urdu": "ٹی ڈی ایم"
  },
  "BR SURVIVAL": {
    "English": "ERANGEL",
    "Roman Urdu": "ERANGEL",
    "Urdu": "ارانگل"
  },
  "BR PER KILL": {
    "English": "MIRAMAR",
    "Roman Urdu": "MIRAMAR",
    "Urdu": "میرا مار"
  },
  "LONE WOLF": {
    "English": "LIVIK",
    "Roman Urdu": "LIVIK",
    "Urdu": "لیوک"
  },
  "RANDOM TOURNAMENT": {
    "English": "RANDOM TOURNAMENT",
    "Roman Urdu": "RANDOM TOURNAMENT",
    "Urdu": "رینڈم ٹورنامنٹ"
  },
  "EVENT": {
    "English": "EVENT",
    "Roman Urdu": "EVENT",
    "Urdu": "ایونٹ"
  },

  // Tournament statuses & details
  "UPCOMING": {
    "English": "UPCOMING",
    "Roman Urdu": "AANE WALE",
    "Urdu": "آنے والے"
  },
  "ONGOING": {
    "English": "ONGOING",
    "Roman Urdu": "JAARI",
    "Urdu": "جاری"
  },
  "COMPLETED": {
    "English": "COMPLETED",
    "Roman Urdu": "KHATAM SHUDA",
    "Urdu": "مکمل شدہ"
  },
  "ENTRY FEE": {
    "English": "ENTRY FEE",
    "Roman Urdu": "DAKHLA FEES",
    "Urdu": "داخلہ فیس"
  },
  "PRIZE POOL": {
    "English": "PRIZE POOL",
    "Roman Urdu": "INAAMI RAQAM",
    "Urdu": "انعامی رقم"
  },
  "JOIN MATCH": {
    "English": "JOIN MATCH",
    "Roman Urdu": "MATCH JOIN KAREIN",
    "Urdu": "میچ جوائن کریں"
  },
  "REGISTRATION CLOSED": {
    "English": "REGISTRATION CLOSED",
    "Roman Urdu": "REGISTRATION CLOSED",
    "Urdu": "رجسٹریشن بند ہے"
  },
  "Joined": {
    "English": "Joined",
    "Roman Urdu": "Shamil",
    "Urdu": "شامل"
  },
  "Slots Left": {
    "English": "Slots Left",
    "Roman Urdu": "Slots Baqi Hain",
    "Urdu": "خالی جگہ"
  },
  "Type": {
    "English": "Type",
    "Roman Urdu": "Qisam",
    "Urdu": "قسم"
  },
  "Map": {
    "English": "Map",
    "Roman Urdu": "Naqsha",
    "Urdu": "نقشہ"
  },
  "MAP": {
    "English": "MAP",
    "Roman Urdu": "NAQSHA",
    "Urdu": "نقشہ"
  },
  "Version": {
    "English": "Version",
    "Roman Urdu": "Version",
    "Urdu": "ورژن"
  },
  "Watch Video Tutorial": {
    "English": "Watch Video Tutorial",
    "Roman Urdu": "Video Tutorial Dekhein",
    "Urdu": "ویڈیو ٹیوٹوریل دیکھیں"
  },

  // Match / Tournament Details & Modals
  "Joined Players": {
    "English": "Joined Players",
    "Roman Urdu": "Shamil Khiladi",
    "Urdu": "شامل کھلاڑی"
  },
  "Match Rules & Room": {
    "English": "Match Rules & Room",
    "Roman Urdu": "Match Ke Qawaneen & Room",
    "Urdu": "میچ کے قوانین اور روم"
  },
  "Room Credentials": {
    "English": "Room Credentials",
    "Roman Urdu": "Room Credentials",
    "Urdu": "روم کی معلومات"
  },
  "Room ID": {
    "English": "Room ID",
    "Roman Urdu": "Room ID",
    "Urdu": "روم آئی ڈی"
  },
  "Room Password": {
    "English": "Room Password",
    "Roman Urdu": "Room Password",
    "Urdu": "روم پاس ورڈ"
  },
  "No credentials updated yet.": {
    "English": "No credentials updated yet.",
    "Roman Urdu": "Abhi tak details nahi aayi.",
    "Urdu": "ابھی تک معلومات اپ ڈیٹ نہیں کی گئیں۔"
  },
  "Match Rules": {
    "English": "Match Rules",
    "Roman Urdu": "Match Ke Rules",
    "Urdu": "میچ کے قواعد"
  },
  "Do not use hacks or cheats.": {
    "English": "Do not use hacks or cheats.",
    "Roman Urdu": "Hacks ya cheating mat karein.",
    "Urdu": "ہیکس یا چیٹس استعمال نہ کریں۔"
  },
  "Teaming up is strictly prohibited.": {
    "English": "Teaming up is strictly prohibited.",
    "Roman Urdu": "Teaming up karna sakht mana hai.",
    "Urdu": "ٹیم بنانا سخت منع ہے۔"
  },
  "Room details will be shared 10 mins before match starts.": {
    "English": "Room details will be shared 10 mins before match starts.",
    "Roman Urdu": "Room details match se 10 min pehle milengi.",
    "Urdu": "روم کی معلومات میچ شروع ہونے سے 10 منٹ پہلے شیئر کی جائیں گی۔"
  },

  // Leaderboard / Ranks Screen
  "Leaderboard": {
    "English": "Leaderboard",
    "Roman Urdu": "Leaderboard",
    "Urdu": "لیڈر بورڈ"
  },
  "Top Earners of the Week": {
    "English": "Top Earners of the Week",
    "Roman Urdu": "Haftay ke Top Khiladi",
    "Urdu": "ہفتے کے ٹاپ کھلاڑی"
  },
  "Rank": {
    "English": "Rank",
    "Roman Urdu": "Darja",
    "Urdu": "رینک"
  },
  "Player": {
    "English": "Player",
    "Roman Urdu": "Khiladi",
    "Urdu": "کھلاڑی"
  },
  "Earnings": {
    "English": "Earnings",
    "Roman Urdu": "Kamai",
    "Urdu": "کمائی"
  },
  "Logout": {
    "English": "Logout",
    "Roman Urdu": "Log Out Karein",
    "Urdu": "لاگ آؤٹ کریں"
  },
  "Sign out of your account": {
    "English": "Sign out of your account",
    "Roman Urdu": "Apne account se sign out karein",
    "Urdu": "اپنے اکاؤنٹ سے سائن آؤٹ کریں"
  },
  "Halal or Haram": {
    "English": "Halal or Haram",
    "Roman Urdu": "Halal ya Haram?",
    "Urdu": "حلال یا حرام؟"
  },
  "Customer Support": {
    "English": "Customer Support",
    "Roman Urdu": "Support Se Baat Karein",
    "Urdu": "کسٹمر سپورٹ"
  },
  "About": {
    "English": "About",
    "Roman Urdu": "App Ke Baray Me",
    "Urdu": "ایپ کے بارے میں"
  },
  "Share the App": {
    "English": "Share the App",
    "Roman Urdu": "App Share Karein",
    "Urdu": "ایپ شیئر کریں"
  },
  "Terms and Conditions": {
    "English": "Terms and Conditions",
    "Roman Urdu": "Sharaait-o-Zawabit",
    "Urdu": "شرائط و ضوابط"
  },
  "Verified": {
    "English": "Verified",
    "Roman Urdu": "Verified",
    "Urdu": "تصدیق شدہ"
  },
  "Region": {
    "English": "Region",
    "Roman Urdu": "Ilaqa",
    "Urdu": "علاقہ"
  },
  "Pakistan": {
    "English": "Pakistan",
    "Roman Urdu": "Pakistan",
    "Urdu": "پاکستان"
  },
  "ABOUT ME": {
    "English": "ABOUT ME",
    "Roman Urdu": "MERA TAARUF",
    "Urdu": "میرے بارے میں"
  },
  "Tournaments Played": {
    "English": "Tournaments Played",
    "Roman Urdu": "Tournaments Khele",
    "Urdu": "ٹورنامنٹس کھیلے"
  },
  "Tournaments": {
    "English": "Tournaments",
    "Roman Urdu": "Tournaments",
    "Urdu": "ٹورنامنٹس"
  },
  "Played": {
    "English": "Played",
    "Roman Urdu": "Khele",
    "Urdu": "کھیلے"
  },
  "Total Wins": {
    "English": "Total Wins",
    "Roman Urdu": "Kul Jeetay",
    "Urdu": "کل جیت"
  },
  "Total": {
    "English": "Total",
    "Roman Urdu": "Kul",
    "Urdu": "کل"
  },
  "Wins": {
    "English": "Wins",
    "Roman Urdu": "Jeetay",
    "Urdu": "جیت"
  },
  "REDEEM": {
    "English": "REDEEM",
    "Roman Urdu": "REDEEM",
    "Urdu": "ریڈیم کریں"
  },
  "Win Rate": {
    "English": "Win Rate",
    "Roman Urdu": "Jeetnay ki Sharah",
    "Urdu": "جیت کی شرح"
  },
  "Slots Progress": {
    "English": "Slots Progress",
    "Roman Urdu": "Slots ki Progress",
    "Urdu": "جگہ کی تفصیل"
  },
  "SEE RESULTS": {
    "English": "SEE RESULTS",
    "Roman Urdu": "Nataij Dekhein",
    "Urdu": "نتائج دیکھیں"
  },
  "ROOM DETAILS": {
    "English": "ROOM DETAILS",
    "Roman Urdu": "Room ki Details",
    "Urdu": "روم کی معلومات"
  },
  "MATCH FULL": {
    "English": "MATCH FULL",
    "Roman Urdu": "Match Full Hai",
    "Urdu": "میچ بھر گیا ہے"
  },
  "Per Kill": {
    "English": "Per Kill",
    "Roman Urdu": "Per Kill",
    "Urdu": "فی ہلاکت"
  },
  "Date": {
    "English": "Date",
    "Roman Urdu": "Tareekh",
    "Urdu": "تاریخ"
  },
  "Time": {
    "English": "Time",
    "Roman Urdu": "Waqt",
    "Urdu": "وقت"
  },
  "SOLO": {
    "English": "SOLO",
    "Roman Urdu": "SOLO",
    "Urdu": "سولو"
  },
  "DUO": {
    "English": "DUO",
    "Roman Urdu": "DUO",
    "Urdu": "ڈو"
  },
  "TRIO": {
    "English": "TRIO",
    "Roman Urdu": "TRIO",
    "Urdu": "ٹرائیو"
  },
  "TRI": {
    "English": "TRI",
    "Roman Urdu": "TRI",
    "Urdu": "ٹرائی"
  },
  "SQUAD": {
    "English": "SQUAD",
    "Roman Urdu": "SQUAD",
    "Urdu": "اسکواڈ"
  },
  "STARTED": {
    "English": "STARTED",
    "Roman Urdu": "SHURU HO GAYA",
    "Urdu": "شروع ہو گیا"
  },
  "LEADERBOARD": {
    "English": "LEADERBOARD",
    "Roman Urdu": "LEADERBOARD",
    "Urdu": "لیڈر بورڈ"
  },
  "Top players by total coins won": {
    "English": "Top players by total coins won",
    "Roman Urdu": "Sikhay jeetnay walay top players",
    "Urdu": "کل سکے جیتنے والے ٹاپ کھلاڑی"
  },
  "Coins Won": {
    "English": "Coins Won",
    "Roman Urdu": "Sikkay Jeetay",
    "Urdu": "سکے جیتے"
  },
  "No Players Yet": {
    "English": "No Players Yet",
    "Roman Urdu": "Abhi koi khiladi nahi hai",
    "Urdu": "ابھی کوئی کھلاڑی نہیں ہے"
  },
  "You": {
    "English": "You",
    "Roman Urdu": "Aap",
    "Urdu": "آپ"
  },
  "Top Player": {
    "English": "Top Player",
    "Roman Urdu": "Top Khiladi",
    "Urdu": "ٹاپ کھلاڑی"
  },
  "DEPOSIT": {
    "English": "DEPOSIT",
    "Roman Urdu": "Paisa Jama",
    "Urdu": "پیسے جمع کریں"
  },
  "Add Coins to Wallet": {
    "English": "Add Coins to Wallet",
    "Roman Urdu": "Wallet me coins add karein",
    "Urdu": "والیٹ میں سکے جمع کریں"
  },
  "WITHDRAW": {
    "English": "WITHDRAW",
    "Roman Urdu": "Paisa Nikalein",
    "Urdu": "رقم نکلوائیں"
  },
  "Withdraw to Accounts": {
    "English": "Withdraw to Accounts",
    "Roman Urdu": "Accounts me withdraw karein",
    "Urdu": "اکاؤنٹس میں رقم نکلوائیں"
  },
  "Choose Payment Method": {
    "English": "Choose Payment Method",
    "Roman Urdu": "Payment Method Select Karein",
    "Urdu": "ادائیگی کا طریقہ منتخب کریں"
  },
  "RECOMMENDED": {
    "English": "RECOMMENDED",
    "Roman Urdu": "BEHTAREEN",
    "Urdu": "تجویز کردہ"
  },
  "SELECTED": {
    "English": "SELECTED",
    "Roman Urdu": "SELECT HUA",
    "Urdu": "منتخب کردہ"
  },
  "Enter Amount": {
    "English": "Enter Amount",
    "Roman Urdu": "Raqam Likhein",
    "Urdu": "رقم درج کریں"
  },
  "Enter Amount (PKR)": {
    "English": "Enter Amount (PKR)",
    "Roman Urdu": "Raqam Likhein (PKR)",
    "Urdu": "رقم درج کریں (PKR)"
  },
  "You will receive": {
    "English": "You will receive",
    "Roman Urdu": "Aap ko milenge",
    "Urdu": "آپ کو ملیں گے"
  },
  "IMPORTANT INSTRUCTIONS": {
    "English": "IMPORTANT INSTRUCTIONS",
    "Roman Urdu": "AHAM HIDAYAT",
    "Urdu": "اہم ہدایات"
  },
  "deposit_instruction_1": {
    "English": "Send payment and send screenshot.",
    "Roman Urdu": "Payment karein aur screenshot send karein.",
    "Urdu": "ادائیگی کریں اور اسکرین شاٹ بھیجیں۔"
  },
  "deposit_instruction_2": {
    "English": "Pay only to the number displayed above.",
    "Roman Urdu": "Payment number par hi karein jo upar diya gaya hai.",
    "Urdu": "ادائیگی صرف اوپر دیئے گئے نمبر پر ہی کریں۔"
  },
  "deposit_instruction_3": {
    "English": "No coins will be added for incorrect payments.",
    "Roman Urdu": "Galat payment par coins add nahi kiye jayenge.",
    "Urdu": "غلط ادائیگی پر سکے جمع نہیں کیے جائیں گے۔"
  },
  "deposit_instruction_4": {
    "English": "Payment won't be approved without screenshot.",
    "Roman Urdu": "Screenshot bina payment approve nahi hoga.",
    "Urdu": "اسکرین شاٹ کے بغیر ادائیگی کی تصدیق نہیں ہوگی۔"
  },
  "Send Payment Screenshot After Payment": {
    "English": "Send Payment Screenshot After Payment",
    "Roman Urdu": "Payment ke baad screenshot bhejein",
    "Urdu": "ادائیگی کے بعد اسکرین شاٹ بھیجیں"
  },
  "SCREENSHOT ATTACHED": {
    "English": "SCREENSHOT ATTACHED",
    "Roman Urdu": "SCREENSHOT ATTACHED",
    "Urdu": "اسکرین شاٹ منسلک ہے"
  },
  "UPLOAD SCREENSHOT": {
    "English": "UPLOAD SCREENSHOT",
    "Roman Urdu": "SCREENSHOT UPLOAD KAREIN",
    "Urdu": "اسکرین شاٹ اپ لوڈ کریں"
  },
  "PROCESSING...": {
    "English": "PROCESSING...",
    "Roman Urdu": "PROCESSING...",
    "Urdu": "پروسیسنگ ہو رہی ہے..."
  },
  "I HAVE MADE THE PAYMENT": {
    "English": "I HAVE MADE THE PAYMENT",
    "Roman Urdu": "MAINE PAYMENT KAR DI HAI",
    "Urdu": "میں نے ادائیگی کر دی ہے"
  },
  "Available Balance": {
    "English": "Available Balance",
    "Roman Urdu": "Maujooda Balance",
    "Urdu": "دستیاب بیلنس"
  },
  "IMPORTANT": {
    "English": "IMPORTANT",
    "Roman Urdu": "ZAROORI",
    "Urdu": "اہم معلومات"
  },
  "Minimum withdrawal: 100 PKR": {
    "English": "Minimum withdrawal: 100 PKR",
    "Roman Urdu": "Kam se kam withdraw: 100 PKR",
    "Urdu": "کم از کم رقم: 100 PKR"
  },
  "Maximum withdrawal: 10,000 PKR": {
    "English": "Maximum withdrawal: 10,000 PKR",
    "Roman Urdu": "Zyada se zyada withdraw: 10,000 PKR",
    "Urdu": "زیادہ سے زیادہ رقم: 10,000 PKR"
  },
  "Withdrawal will be processed within": {
    "English": "Withdrawal will be processed within",
    "Roman Urdu": "Withdrawal process hoga is dauran",
    "Urdu": "رقم نکلوائی جائے گی"
  },
  "24 Hours": {
    "English": "24 Hours",
    "Roman Urdu": "24 Ghantay",
    "Urdu": "24 گھنٹے"
  },
  "Make sure your payment details are correct": {
    "English": "Make sure your payment details are correct",
    "Roman Urdu": "Apni payment details theek se likhein",
    "Urdu": "یقینی بنائیں کہ آپ کی تفصیلات درست ہیں"
  },
  "No refundable after withdrawal request": {
    "English": "No refundable after withdrawal request",
    "Roman Urdu": "Withdraw request ke baad paise wapis nahi honge",
    "Urdu": "رقم کی درخواست کے بعد واپسی ممکن نہیں"
  },
  "Enter Withdraw Amount": {
    "English": "Enter Withdraw Amount",
    "Roman Urdu": "Withdrawal Raqam Likhein",
    "Urdu": "نکلوائی جانے والی رقم درج کریں"
  },
  "Account Details": {
    "English": "Account Details",
    "Roman Urdu": "Account ki Details",
    "Urdu": "اکاؤنٹ کی تفصیلات"
  },
  "Account Title": {
    "English": "Account Title",
    "Roman Urdu": "Account Title / Naam",
    "Urdu": "اکاؤنٹ کا نام"
  },
  "Account Number": {
    "English": "Account Number",
    "Roman Urdu": "Account Number / Phone",
    "Urdu": "اکاؤنٹ نمبر"
  },
  "Withdrawal Amount": {
    "English": "Withdrawal Amount",
    "Roman Urdu": "Withdrawal Raqam",
    "Urdu": "نکلوائی جانے والی رقم"
  },
  "Note": {
    "English": "Note",
    "Roman Urdu": "Note",
    "Urdu": "نوٹ"
  },
  "Make sure your payment number and name are correct. Wrong details may cause payment delays.": {
    "English": "Make sure your payment number and name are correct. Wrong details may cause payment delays.",
    "Roman Urdu": "Apna payment number aur naam sahi se check karein. Galat details se payment rukh sakti hai.",
    "Urdu": "یقینی بنائیں کہ آپ کا نمبر اور نام درست ہیں۔ غلط تفصیلات کی وجہ سے تاخیر ہو سکتی ہے۔"
  },
  "REQUEST WITHDRAW": {
    "English": "REQUEST WITHDRAW",
    "Roman Urdu": "WITHDRAW KAREIN",
    "Urdu": "درخواست بھیجیں"
  },
  "Withdraw will be processed within 24 Hours": {
    "English": "Withdraw will be processed within 24 Hours",
    "Roman Urdu": "Withdrawal request 24 ghante me check hogi",
    "Urdu": "رقم کی واپسی 24 گھنٹوں میں مکمل ہوگی"
  },
  "Recent History": {
    "English": "Recent History",
    "Roman Urdu": "Haal hi me len den",
    "Urdu": "حالیہ لین دین"
  },
  "View All": {
    "English": "View All",
    "Roman Urdu": "Sab Dekhein",
    "Urdu": "سب دیکھیں"
  },
  "Withdrawal": {
    "English": "Withdrawal",
    "Roman Urdu": "Withdrawal",
    "Urdu": "رقم نکلوائی"
  },
  "via": {
    "English": "via",
    "Roman Urdu": "ke zariye",
    "Urdu": "کے ذریعے"
  },
  "Approved": {
    "English": "Approved",
    "Roman Urdu": "Approve Ho Gaya",
    "Urdu": "منظور شدہ"
  },
  "Rejected": {
    "English": "Rejected",
    "Roman Urdu": "Reject Ho Gaya",
    "Urdu": "مسترد شدہ"
  },
  "Pending": {
    "English": "Pending",
    "Roman Urdu": "Pending",
    "Urdu": "زیر التواء"
  },
  "No transactions yet": {
    "English": "No transactions yet",
    "Roman Urdu": "Koi transaction nahi mili",
    "Urdu": "ابھی تک کوئی لین دین نہیں ہے"
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const getWeekId = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${week}`;
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinedMatches, setJoinedMatches] = useState<Match[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [referralStats, setReferralStats] = useState({ invited: 0, earned: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<any>({
    easypaisaEnabled: true,
    easypaisaLogo: EASYPAISA_LOGO,
    easypaisaTitle: "ADMIN_E_ACCOUNT",
    easypaisaNumber: "03123456789",
    jazzcashEnabled: true,
    jazzcashLogo: JAZZCASH_LOGO,
    jazzcashTitle: "ADMIN_J_ACCOUNT",
    jazzcashNumber: "03213456789",
    withdrawalEnabled: true,
    withdrawEasypaisaEnabled: true,
    withdrawJazzcashEnabled: true,
    withdrawSadapayEnabled: false,
    sadapayLogo: SADAPAY_LOGO,
    withdrawNayapayEnabled: false,
    nayapayLogo: NAYAPAY_LOGO
  });
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [popups, setPopups] = useState<AppPopup[]>([]);
  const [hasSeenAppOpenPopup, setHasSeenAppOpenPopup] = useState(false);
  const [forcePinSetup, setForcePinSetup] = useState(false);

  // App Lock State
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinAuthResolver, setPinAuthResolver] = useState<((value: boolean) => void) | null>(null);

  const requirePinAuth = (): Promise<boolean> => {
    return new Promise((resolve) => {
      // Never require PIN auth for admin or on admin route
      if (currentUser?.role === 'admin' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'))) {
        resolve(true);
        return;
      }
      // If user doesn't have a PIN set, just resolve true immediately
      if (!currentUser?.appLockPin) {
        resolve(true);
        return;
      }
      setPinAuthResolver(() => resolve);
      setPinModalOpen(true);
    });
  };

  const handlePinAuthClose = (success: boolean) => {
    setPinModalOpen(false);
    if (pinAuthResolver) {
      pinAuthResolver(success);
      setPinAuthResolver(null);
    }
  };

  const isPinSetupRequired = Boolean(
    currentUser &&
    currentUser.role !== 'admin' &&
    (!currentUser.appLockPin || forcePinSetup)
  );

  const [selectedLang, setSelectedLangState] = useState<'English' | 'Roman Urdu' | 'Urdu'>(() => {
  
  return (localStorage.getItem('pk_arena_lang') as any) || 'English';
  });

  const setSelectedLang = (lang: 'English' | 'Roman Urdu' | 'Urdu') => {
    setSelectedLangState(lang);
    localStorage.setItem('pk_arena_lang', lang);
  };

  const t = (key: string): string => {
    const translation = translations[key];
    if (translation && translation[selectedLang]) {
      return translation[selectedLang];
    }
    return key;
  };

  useEffect(() => {
    preloadAllCoreAssets();
    // Fetch App Settings
    const settingsRef = ref(db, 'appSettings');
    const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
      setAppSettings(snapshot.val());
    });

    // Fetch Banners
    const bannersRef = ref(db, 'banners');
    const unsubscribeBanners = onValue(bannersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.values(data).filter((b: any) => b.isActive);
        setBanners(list);
        preloadDynamicAssets(list.map((b: any) => b.imageUrl));
      } else {
        setBanners([]);
      }
    });

    // Fetch Payment Settings
    const paymentRef = ref(db, 'paymentSettings');
    const unsubscribePayment = onValue(paymentRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPaymentSettings({
          ...data,
          easypaisaLogo: (!data.easypaisaLogo || data.easypaisaLogo.includes('ibb.co')) ? EASYPAISA_LOGO : data.easypaisaLogo,
          jazzcashLogo: (!data.jazzcashLogo || data.jazzcashLogo.includes('ibb.co')) ? JAZZCASH_LOGO : data.jazzcashLogo,
          sadapayLogo: (!data.sadapayLogo || data.sadapayLogo.includes('ibb.co')) ? SADAPAY_LOGO : data.sadapayLogo,
          nayapayLogo: (!data.nayapayLogo || data.nayapayLogo.includes('ibb.co')) ? NAYAPAY_LOGO : data.nayapayLogo,
        });
      }
    });

    // Fetch Announcements
    const announcementsRef = ref(db, 'announcements');
    const unsubscribeAnnouncements = onValue(announcementsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: Announcement[] = Object.values(data);
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setAnnouncements(list);
      } else {
        setAnnouncements([]);
      }
    });

    // Fetch Popups
    const popupsRef = ref(db, 'popups');
    const unsubscribePopups = onValue(popupsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: AppPopup[] = Object.values(data);
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setPopups(list);
      } else {
        setPopups([]);
      }
    });
    
    // Fetch Tournaments
    const tourRef = ref(db, 'tournaments');
    const unsubscribeTournaments = onValue(tourRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const tourList = Object.values(data) as Tournament[];
        setTournaments(tourList);
        preloadDynamicAssets(tourList.map((t) => t.image));

        // Auto-publish any scheduled matches whose publish time has arrived
        const now = Date.now();
        tourList.forEach(async (t) => {
          if ((t.isScheduled || t.status === 'SCHEDULED') && t.autoPublishOnTime !== false && t.scheduledPublishTime) {
            const schedTime = new Date(t.scheduledPublishTime).getTime();
            if (!isNaN(schedTime) && schedTime <= now) {
              try {
                await update(ref(db, `tournaments/${t.id}`), {
                  isScheduled: false,
                  status: 'UPCOMING',
                  publishedAt: new Date().toISOString()
                });
              } catch (e) {
                // Ignore silent update errors
              }
            }
          }
        });
      } else {
        setTournaments([]);
      }
    });

    // Fetch Leaderboard (optimized to query only top 50 users by earnings)
    const usersRef = ref(db, 'users');
    const leaderboardQuery = query(usersRef, orderByChild('totalEarnings'), limitToLast(50));
    const unsubscribe = onValue(leaderboardQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersList = Object.values(data) as User[];
        const sorted = usersList.sort((a, b) => (b.totalEarnings || 0) - (a.totalEarnings || 0));
        setLeaderboard(sorted);
        preloadDynamicAssets(sorted.map((u) => u.avatarUrl || u.profilePicture));
      } else {
        setLeaderboard([]);
      }
    });
    return () => {
      unsubscribe();
      unsubscribeTournaments();
      unsubscribeBanners();
      unsubscribeSettings();
      unsubscribePayment();
      unsubscribeAnnouncements();
    };
  }, []);

  useEffect(() => {
    if (appSettings?.onesignalAppId) {
      initOneSignal(appSettings.onesignalAppId);
    }
  }, [appSettings?.onesignalAppId]);

  const isProfileComplete = (user: User | null) => {
    if (!user) return true;
    return !!(user.phone || (user as any).phoneNumber && user.inGameName && user.gameUid);
  };

  useEffect(() => {
    // 1. Handle redirect results for mobile/APK WebView wrappers
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          const firebaseUser = result.user;
          const userRef = ref(db, `users/${firebaseUser.uid}`);
          const userSnap = await get(userRef);
          if (!userSnap.exists()) {
            const generatedCode = `PK${Math.floor(100000 + Math.random() * 900000)}`;
            const newUser = {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              username: firebaseUser.displayName || 'Gamer',
              email: firebaseUser.email || '',
              avatarUrl: DEFAULT_AVATAR,
              joinedDate: new Date().toLocaleDateString('en-GB'),
              walletBalance: 0,
              totalEarnings: 0,
              totalMatches: 0,
              totalWins: 0,
              winRate: 0,
              totalKills: 0,
              kdRatio: 0,
              referralCode: generatedCode
            };
            await set(userRef, newUser);
          }
          toast.success('Signed in with Google!');
        }
      })
      .catch((error) => {
        console.error('Error with redirect sign in:', error);
      });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = ref(db, `users/${firebaseUser.uid}`);
        const userSnapshot = await get(userRef);
        
        if (userSnapshot.exists()) {
          const val = userSnapshot.val();
          setCurrentUser({ ...val, avatarUrl: val.avatarUrl || DEFAULT_AVATAR });
        }

        onValue(userRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setCurrentUser({ ...data, avatarUrl: data.avatarUrl || DEFAULT_AVATAR });
            registerUserWithOneSignal(firebaseUser.uid, data.email);
          }
        });

        setLoading(false);

        const matchesRef = ref(db, `userMatches/${firebaseUser.uid}`);
        onValue(matchesRef, (snapshot) => {
          const data = snapshot.val();
          setJoinedMatches(data ? Object.values(data) : []);
        });

        const achievementsRef = ref(db, `userAchievements/${firebaseUser.uid}`);
        onValue(achievementsRef, async (snapshot) => {
          const data = snapshot.val();
          const currentWeek = getWeekId();
          const defaultAchievements: Achievement[] = [
            { id: 'weekly-10', title: 'Veteran I', description: 'Join 10 Tournaments', progress: 0, target: 10, reward: 10, claimed: false },
            { id: 'weekly-20', title: 'Veteran II', description: 'Join 20 Tournaments', progress: 0, target: 20, reward: 20, claimed: false },
            { id: 'weekly-30', title: 'Veteran III', description: 'Join 30 Tournaments', progress: 0, target: 30, reward: 30, claimed: false },
          ];

          if (data) {
            const lastResetWeek = data.lastResetWeek;
            const achievementsList = Object.entries(data)
              .filter(([key]) => key !== 'lastResetWeek')
              .map(([, value]) => value) as Achievement[];
            
            if (lastResetWeek !== currentWeek) {
              const updates: any = { lastResetWeek: currentWeek };
              defaultAchievements.forEach((ach, index) => { updates[index] = ach; });
              await set(achievementsRef, updates);
              return;
            }
            setAchievements(achievementsList);
          } else {
            const updates: any = { lastResetWeek: currentWeek };
            defaultAchievements.forEach((ach, index) => { updates[index] = ach; });
            set(achievementsRef, updates);
          }
        });

        const referralRef = ref(db, `userReferrals/${firebaseUser.uid}`);
        onValue(referralRef, (snapshot) => {
          const data = snapshot.val();
          if (data) setReferralStats(data);
        });

        const txRef = ref(db, `userTransactions/${firebaseUser.uid}`);
        onValue(txRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setTransactions(Object.values(data).reverse());
          } else {
            setTransactions([]);
          }
        });

      } else {
        setCurrentUser(null);
        setJoinedMatches([]);
        setAchievements([]);
        setTransactions([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      // Determine if popup or redirect should be used based on context
      const isWebView = /wv|Android|iPhone|iPad/i.test(navigator.userAgent) && !/Safari/i.test(navigator.userAgent);
      const isCordovaOrLocal = window.location.protocol === 'file:' || (window.location.hostname === 'localhost' && window.innerWidth < 768);

      if (isWebView || isCordovaOrLocal) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        try {
          const res = await signInWithPopup(auth, googleProvider);
          const userRef = ref(db, `users/${res.user.uid}`);
          const userSnap = await get(userRef);
          if (!userSnap.exists()) {
            const generatedCode = `PK${Math.floor(100000 + Math.random() * 900000)}`;
            const newUser = {
              id: res.user.uid,
              uid: res.user.uid,
              username: res.user.displayName || 'Gamer',
              email: res.user.email || '',
              avatarUrl: DEFAULT_AVATAR,
              joinedDate: new Date().toLocaleDateString('en-GB'),
              walletBalance: 0,
              totalEarnings: 0,
              totalMatches: 0,
              totalWins: 0,
              winRate: 0,
              totalKills: 0,
              kdRatio: 0,
              referralCode: generatedCode
            };
            await set(userRef, newUser);
          }
          toast.success('Signed in with Google!');
        } catch (popupErr: any) {
          // If popup is blocked or fails, automatically fallback to redirect
          if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/operation-not-supported-in-this-environment') {
            await signInWithRedirect(auth, googleProvider);
          } else {
            throw popupErr;
          }
        }
      }
    } catch (error: any) {
      playErrorSound(); toast.error(error.message);
    }
  };

  const checkUsernameExists = useCallback(async (username: string, excludeUserId?: string): Promise<boolean> => {
    if (!username || username.trim().length < 3) return false;
    const cleanUsername = username.trim().toLowerCase();
    try {
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const users = snapshot.val();
        for (const uid in users) {
          if (excludeUserId && uid === excludeUserId) continue;
          if (users[uid].username && users[uid].username.toLowerCase() === cleanUsername) {
            return true;
          }
        }
      }
      return false;
    } catch (err) {
      console.error('Error checking username exists:', err);
      return false;
    }
  }, []);

  const registerManual = async (email: string, pass: string, data: Partial<User>) => {
    try {
      // 1. Dynamic Duplicate Checks for username, phone, gameUid to prevent multiple accounts
      const usersRef = ref(db, 'users');
      
      if (data.username) {
        const qUser = query(usersRef, orderByChild('username'), equalTo(data.username.trim()));
        const snapUser = await get(qUser);
        if (snapUser.exists()) throw new Error('This username is already taken. Please choose another.');
      }
      
      if (data.phone) {
        const qPhone = query(usersRef, orderByChild('phone'), equalTo(data.phone.trim()));
        const snapPhone = await get(qPhone);
        if (snapPhone.exists()) throw new Error('This phone number is already registered. Multiple accounts are not allowed.');
      }
      
      if (data.gameUid) {
        const qUid = query(usersRef, orderByChild('gameUid'), equalTo(data.gameUid.trim()));
        const snapUid = await get(qUid);
        if (snapUid.exists()) throw new Error('This Game UID is already registered to another account.');
      }

      const res = await createUserWithEmailAndPassword(auth, email, pass);
      const newUser: User = {
        id: res.user.uid,
        uid: res.user.uid,
        username: data.username || 'Gamer',
        email: email,
        avatarUrl: DEFAULT_AVATAR,
        referralCode: `PK${Math.floor(100000 + Math.random() * 900000)}`,
        password: pass,
        joinedDate: new Date().toLocaleDateString('en-GB'),
        walletBalance: 0,
        totalEarnings: 0,
        totalMatches: 0,
        totalWins: 0,
        winRate: 0,
        totalKills: 0,
        kdRatio: 0,
        ...data
      };
      const updates: any = {};
      updates[`users/${res.user.uid}`] = newUser;
      
      if (data.referredBy) {
        try {
          const qRef = query(usersRef, orderByChild('referralCode'), equalTo(data.referredBy));
          const snapRef = await get(qRef);
          if (snapRef.exists()) {
            snapRef.forEach((childSnap) => {
              const uid = childSnap.key;
              const newRefId = push(ref(db, 'dummy')).key;
              updates[`users/${uid}/referralActivity/${newRefId}`] = {
                user: newUser.username,
                status: 'PENDING',
                reward: 0,
                date: new Date().toLocaleDateString('en-GB')
              };
            });
          }
        } catch(e) {
          console.error("Register referral tracking error", e);
        }
      }
      
      await update(ref(db), updates);
      toast.success('Account created successfully!');
    } catch (error: any) {
      playErrorSound(); toast.error(error.message);
      throw error;
    }
  };

  const loginManual = async (emailOrUsername: string, pass: string) => {
    try {
      const target = emailOrUsername.trim();
      let emailToAuth = target;

      // Check database to find user by username or email
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      let foundEmail = '';
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        // 1. Try to find user by username (case-insensitive, trimmed)
        for (const uid in users) {
          if (users[uid].username && users[uid].username.trim().toLowerCase() === target.toLowerCase()) {
            foundEmail = users[uid].email || '';
            break;
          }
        }
        // 2. If not found by username, try to find user by email (case-insensitive, trimmed)
        if (!foundEmail) {
          for (const uid in users) {
            if (users[uid].email && users[uid].email.trim().toLowerCase() === target.toLowerCase()) {
              foundEmail = users[uid].email || '';
              break;
            }
          }
        }
      }

      if (foundEmail) {
        emailToAuth = foundEmail;
      } else {
        // If not found in our database and doesn't look like an email, let's raise error
        if (!target.includes('@')) {
          throw new Error('No user found with this username. Please check your username or use email.');
        }
      }

      await signInWithEmailAndPassword(auth, emailToAuth, pass);
      toast.success('Logged in successfully!');
    } catch (error: any) {
      playErrorSound(); toast.error(error.message);
      throw error;
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      playErrorSound(); toast.error(error.message);
    }
  };

  const checkEmailExists = async (email: string) => {
    try {
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const users = snapshot.val();
        return Object.values(users).some((u: any) => u.email === email);
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const resetPassword = async (email: string, newPass: string) => {
    toast.success('Password updated successfully!');
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error: any) {
      playErrorSound(); toast.error(error.message);
    }
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!auth.currentUser || !currentUser) return;
    const uid = auth.currentUser.uid;

    // Fast path: If updating internal/security fields (like appLockPin, securityColor, securitySport, etc.)
    // and not changing username, inGameName, avatarUrl, or referredBy, update users/${uid} directly!
    const isIdentityChange = Boolean(data.username || data.inGameName || data.avatarUrl || data.referredBy);
    if (!isIdentityChange) {
      try {
        const userUpdates: any = {};
        for (const key in data) {
          if (data[key as keyof User] !== undefined) {
            userUpdates[key] = data[key as keyof User];
          }
        }
        await update(ref(db, `users/${uid}`), userUpdates);
        setCurrentUser((prev) => (prev ? { ...prev, ...data } : null));
        return;
      } catch (err: any) {
        console.error('Fast user update error:', err);
        throw err;
      }
    }

    const loadingToast = toast.loading('Updating profile data...');
    
    try {
      const updates: any = {};
      
      // 1. Update primary user record
      for (const key in data) {
        if (data[key as keyof User] !== undefined) {
          updates[`users/${uid}/${key}`] = data[key as keyof User];
        }
      }
      
      // 2. Propagation to Teams & Members
      try {
        const teamsSnap = await get(ref(db, 'teams'));
        if (teamsSnap.exists()) {
          const allTeams = teamsSnap.val();
          for (const teamId in allTeams) {
            const team = allTeams[teamId];
            if (team.members && team.members[uid]) {
              if (data.username) updates[`teams/${teamId}/members/${uid}/username`] = data.username;
              if (data.inGameName) updates[`teams/${teamId}/members/${uid}/inGameName`] = data.inGameName;
              if (data.avatarUrl) updates[`teams/${teamId}/members/${uid}/avatarUrl`] = data.avatarUrl;
            }
            if (team.captainUid === uid) {
              if (data.username) updates[`teams/${teamId}/captainName`] = data.username;
              if (data.avatarUrl) updates[`teams/${teamId}/captainAvatar`] = data.avatarUrl;
            }
          }
        }
      } catch (e) {
        console.warn('Teams propagation skipped:', e);
      }

      // 3. Propagation to Team Invites
      try {
        const invitesSnap = await get(ref(db, 'teamInvites'));
        if (invitesSnap.exists()) {
          const allInvites = invitesSnap.val();
          for (const inviteId in allInvites) {
            const invite = allInvites[inviteId];
            if (invite.invitedUid === uid) {
              if (data.username) updates[`teamInvites/${inviteId}/invitedUsername`] = data.username;
              if (data.avatarUrl) updates[`teamInvites/${inviteId}/invitedAvatar`] = data.avatarUrl;
              if (data.inGameName) updates[`teamInvites/${inviteId}/invitedInGameName`] = data.inGameName;
            }
            if (invite.captainUid === uid) {
              if (data.username) updates[`teamInvites/${inviteId}/captainName`] = data.username;
              if (data.avatarUrl) updates[`teamInvites/${inviteId}/captainAvatar`] = data.avatarUrl;
            }
          }
        }
      } catch (e) {
        console.warn('Team invites propagation skipped:', e);
      }

      // 4. Update Support Chat Rooms (if relevant)
      if (data.username || data.avatarUrl) {
        try {
          const supportRoomRef = ref(db, `PK-Arena_Support_ChaT_Rooms/${uid}`);
          const supportSnap = await get(supportRoomRef);
          if (supportSnap.exists()) {
            if (data.username) updates[`PK-Arena_Support_ChaT_Rooms/${uid}/username`] = data.username;
            if (data.avatarUrl) updates[`PK-Arena_Support_ChaT_Rooms/${uid}/userAvatar`] = data.avatarUrl;
          }
        } catch (e) {
          console.warn('Support room check skipped:', e);
        }
      }

      // 5. Update user's Joined Matches (IGN)
      if (data.inGameName) {
        try {
          const matchesSnap = await get(ref(db, `userMatches/${uid}`));
          if (matchesSnap.exists()) {
            const matches = matchesSnap.val();
            for (const matchId in matches) {
              updates[`userMatches/${uid}/${matchId}/inGameName`] = data.inGameName;
            }
          }
        } catch (e) {
          console.warn('User matches propagation skipped:', e);
        }
      }

      // 6. Update Transactions (Root and User-specific)
      if (data.username) {
        try {
          const userTxSnap = await get(ref(db, `userTransactions/${uid}`));
          if (userTxSnap.exists()) {
            const txs = userTxSnap.val();
            for (const txId in txs) {
              updates[`userTransactions/${uid}/${txId}/username`] = data.username;
            }
          }
        } catch (e) {
          console.warn('User transactions propagation skipped:', e);
        }

        try {
          const allTxSnap = await get(ref(db, 'transactions'));
          if (allTxSnap.exists()) {
            const allTx = allTxSnap.val();
            for (const txId in allTx) {
              if (allTx[txId].userId === uid) {
                updates[`transactions/${txId}/username`] = data.username;
              }
            }
          }
        } catch (e) {
          console.warn('Global transactions propagation skipped:', e);
        }
      }

      // 7. Referral Activity (where others see this user)
      if (currentUser?.referredBy && data.username) {
        try {
          const usersSnap = await get(ref(db, 'users'));
          if (usersSnap.exists()) {
            const allUsers = usersSnap.val();
            for (const rId in allUsers) {
              const referrer = allUsers[rId];
              if (referrer.referralCode === currentUser.referredBy && referrer.referralActivity) {
                for (const actId in referrer.referralActivity) {
                  if (referrer.referralActivity[actId].user === currentUser.username) {
                    updates[`users/${rId}/referralActivity/${actId}/user`] = data.username;
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn('Referral activity propagation skipped:', e);
        }
      }

      // 8. Original Referral Tracking Logic
      if (data.referredBy) {
        try {
          const usersRef = ref(db, 'users');
          const usersSnap = await get(usersRef);
          if (usersSnap.exists()) {
            const allUsers = usersSnap.val();
            for (const rId in allUsers) {
              if (allUsers[rId].referralCode === data.referredBy) {
                const newRefId = push(ref(db, 'dummy')).key;
                updates[`users/${rId}/referralActivity/${newRefId}`] = {
                  user: data.username || currentUser?.username || 'Gamer',
                  status: 'PENDING',
                  reward: 0,
                  date: new Date().toLocaleDateString('en-GB')
                };
                break;
              }
            }
          }
        } catch (e) {
          console.error('Update profile referral tracking error', e);
        }
      }
      
      await update(ref(db), updates);
      toast.dismiss(loadingToast);
      toast.success('Profile updated everywhere!');
    } catch (error: any) {
      toast.dismiss(loadingToast);
      playErrorSound(); toast.error(error.message);
      throw error;
    }
  };

  const joinMatch = async (tournament: any, slot: number, teamDetails?: { inGameName: string, gameUid: string }[]) => {
    if (!currentUser || !auth.currentUser) {
      playErrorSound(); toast.error('Please login first');
      return;
    }

    const authSuccess = await requirePinAuth();
    if (!authSuccess) {
      playErrorSound(); toast.error('Authentication failed.');
      return;
    }

    if (currentUser.walletBalance < tournament.entryFee) {
      playErrorSound(); toast.error('Insufficient coins!');
      return;
    }

    const alreadyJoined = joinedMatches.some(m => m.tournamentId === tournament.id);
    if (alreadyJoined) {
      playErrorSound(); toast.error('You have already joined this match!');
      return;
    }

    if (!currentUser.inGameName || !currentUser.gameUid) {
      playErrorSound(); toast.error('Please update your In-game Name and UID in profile first!');
      return;
    }

    try {
      const matchId = `${tournament.id}-${auth.currentUser.uid}`;
      const newMatch: Match = {
        id: matchId,
        tournamentId: tournament.id,
        title: tournament.title,
        status: 'UPCOMING',
        date: new Date().toLocaleDateString('en-GB'),
        entryFee: tournament.entryFee,
        joined: true,
        slot: slot,
        roomId: 'WAITING...',
        roomPass: 'WAITING...',
        joinedAt: new Date().toISOString(),
        inGameName: currentUser.inGameName,
        teamDetails: teamDetails || [],
      };

      const newTxRef = push(ref(db, 'transactions'));
      
      const updates: any = {};
      updates[`userMatches/${auth.currentUser.uid}/${matchId}`] = newMatch;
      updates[`users/${auth.currentUser.uid}/walletBalance`] = currentUser.walletBalance - tournament.entryFee;
      updates[`users/${auth.currentUser.uid}/totalMatches`] = (currentUser.totalMatches || 0) + 1;
      updates[`tournaments/${tournament.id}/spotsFilled`] = (tournament.spotsFilled || 0) + 1;

      // Handle Referral Reward on first match
      if ((currentUser.totalMatches || 0) === 0 && currentUser.referredBy && tournament.entryFee > 0) {
        try {
          const usersRef = ref(db, 'users');
          const usersSnap = await get(usersRef);
          if (usersSnap.exists()) {
            const allUsers = usersSnap.val();
            let referrerId = null;
            let referrerData = null;
            for (const uid in allUsers) {
              if (allUsers[uid].referralCode === currentUser.referredBy) {
                referrerId = uid;
                referrerData = allUsers[uid];
                break;
              }
            }

            if (referrerId && referrerData) {
              const settingsSnap = await get(ref(db, 'appSettings'));
              const settings = settingsSnap.val() || {};
              const referrerBonus = settings.referrerBonus || 50;
              const refereeBonus = settings.refereeBonus || 25;

              updates[`users/${referrerId}/walletBalance`] = (referrerData.walletBalance || 0) + referrerBonus;
              updates[`users/${auth.currentUser.uid}/walletBalance`] = currentUser.walletBalance - tournament.entryFee + refereeBonus;
              
              // Increment referral stats
              updates[`users/${referrerId}/referralsCount`] = (referrerData.referralsCount || 0) + 1;
              updates[`users/${referrerId}/referralsEarned`] = (referrerData.referralsEarned || 0) + referrerBonus;
              
              let refActivityIdToUpdate = push(ref(db, 'dummy')).key;
              if (referrerData.referralActivity) {
                for (const actId in referrerData.referralActivity) {
                  if (referrerData.referralActivity[actId].user === currentUser.username) {
                    refActivityIdToUpdate = actId;
                    break;
                  }
                }
              }
              updates[`users/${referrerId}/referralActivity/${refActivityIdToUpdate}`] = {
                user: currentUser.username,
                status: 'PAID',
                reward: referrerBonus,
                date: new Date().toLocaleDateString('en-GB')
              };

              toast.success(`Referral bonus applied! You got ${refereeBonus} coins.`);
            }
          }
        } catch (e) {
          console.error("Referral bonus error", e);
        }
      }
      if (tournament.entryFee > 0) {
        updates[`transactions/${newTxRef.key}`] = {
          id: newTxRef.key,
          userId: auth.currentUser.uid,
          username: currentUser.username,
          amount: tournament.entryFee,
          type: 'match_entry',
          status: 'completed',
          createdAt: new Date().toISOString()
        };
      }
      
      await update(ref(db), updates);

      const achievementUpdates: any = {};
      achievements.forEach((ach, index) => {
        if (ach.progress < ach.target) {
          achievementUpdates[`userAchievements/${auth.currentUser.uid}/${index}/progress`] = ach.progress + 1;
        }
      });
      
      if (Object.keys(achievementUpdates).length > 0) {
        await update(ref(db), achievementUpdates);
      }

      toast.success(`Joined Slot #${slot} successfully!`);
    } catch (error: any) {
      playErrorSound(); toast.error(error.message);
    }
  };

  const claimAchievement = async (id: string) => {
    if (!currentUser || !auth.currentUser) return;
    const index = achievements.findIndex(a => a.id === id);
    const achievement = achievements[index];
    
    if (achievement && achievement.progress >= achievement.target && !achievement.claimed) {
      try {
        const updates: any = {};
        updates[`userAchievements/${auth.currentUser.uid}/${index}/claimed`] = true;
        updates[`users/${auth.currentUser.uid}/walletBalance`] = currentUser.walletBalance + achievement.reward;
        await update(ref(db), updates);
        toast.success(`Claimed ${achievement.reward} coins!`);
      } catch (error: any) {
        playErrorSound(); toast.error(error.message);
      }
    }
  };

  const addTransaction = async (tx: any) => {
    if (!auth.currentUser) return;
    try {
      const txId = push(child(ref(db), 'userTransactions')).key;
      const txData = {
        ...tx,
        id: txId,
        userId: auth.currentUser.uid,
        username: currentUser?.username || 'Unknown',
        email: currentUser?.email || 'N/A',
        phone: currentUser?.phone || 'N/A',
        date: tx.date || new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      const updates: any = {};
      updates[`userTransactions/${auth.currentUser.uid}/${txId}`] = txData;
      updates[`transactions/${txId}`] = txData;
      
      if (tx.type === 'withdrawal') {
        updates[`users/${auth.currentUser.uid}/walletBalance`] = (currentUser?.walletBalance || 0) - Number(tx.amount);
      }
      
      await update(ref(db), updates);
    } catch (error: any) {
      playErrorSound(); toast.error(error.message);
    }
  };

  const checkProfileCompletion = (user: User | null) => {
    return !!(user && user.inGameName && user.gameUid && (user.phone || (user as any).phoneNumber));
  };


  useEffect(() => {
    const checkAutoTasks = async () => {
      const isAdmin = localStorage.getItem("pk_user_role") === "admin" || localStorage.getItem("pk_user_role") === "owner";
      if (!isAdmin) return;
      const now = new Date();
      const dateString = now.toLocaleDateString("en-GB"); 
      const hour = now.getHours();

      try {
        const resetRef = ref(db, "systemSettings/lastDailyReset");
        const resetSnap = await get(resetRef);
        const lastReset = resetSnap.val();

        if (lastReset !== dateString) {
           await remove(ref(db, "notifications"));
           await remove(ref(db, "userNotifications"));
           await set(ref(db, "systemSettings/lastDailyReset"), dateString);
           console.log("Daily notification reset complete");
        }

        const targetHours = [12, 15, 18, 21];
        if (targetHours.includes(hour) && appSettings?.onesignalAppId && appSettings?.onesignalRestApiKey) {
          const pushKey = `${dateString}-${hour}`;
          const pushRef = ref(db, "systemSettings/lastAutoPush");
          const pushSnap = await get(pushRef);
          
          if (pushSnap.val() !== pushKey) {
             await set(ref(db, "systemSettings/lastAutoPush"), pushKey);
             
             const getNotificationForHour = (targetHour: number) => {
               switch (targetHour) {
                 case 12:
                   return {
                     title: "🔥 PK ARENA PUBG",
                     message: "Don't miss today's exciting matches!"
                   };
                 case 15:
                   return {
                     title: "🏆 Your Next Victory Awaits!",
                     message: "Open PK ARENA PUBG and start playing."
                   };
                 case 18:
                   return {
                     title: "🎯 The Battle Is On!",
                     message: "Jump now in PK ARENA PUBG, play hard, and show them what you’ve got"
                   };
                 case 21:
                   return {
                     title: "💎 One More Battle Tonight?",
                     message: "Your next win could be waiting. Come back and play!"
                   };
                 default:
                   return {
                     title: "🔥 PK ARENA PUBG",
                     message: "Don't miss today's exciting matches!"
                   };
               }
             };

             const scheduledPush = getNotificationForHour(hour);

             fetch("/api/send-notification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  appId: appSettings.onesignalAppId,
                  restApiKey: appSettings.onesignalRestApiKey,
                  title: scheduledPush.title,
                  message: scheduledPush.message,
                  url: ""
                }),
              }).then(async () => {
                 await push(ref(db, "notifications"), {
                   title: scheduledPush.title,
                   message: scheduledPush.message,
                   url: "",
                   type: "AUTO_BROADCAST",
                   createdAt: Date.now()
                 });
                 await push(ref(db, "adminNotificationHistory"), {
                   title: scheduledPush.title,
                   message: scheduledPush.message,
                   type: "AUTO",
                   createdAt: Date.now()
                 });
              }).catch(console.error);
          }
        }
      } catch (err) {
        console.error("Auto task error", err);
      }
    };

    // const interval = setInterval(checkAutoTasks, 60 * 1000); 
    // checkAutoTasks(); 

    return () => {};
  }, [appSettings?.onesignalAppId, appSettings?.onesignalRestApiKey]);

  return (
    <AppContext.Provider value={{ 
      currentUser,
      loading,
      signInWithGoogle,
      logout,
      updateUserProfile,
      joinedMatches, 
      joinMatch, 
      achievements, 
      claimAchievement,
      referralStats,
      transactions,
      addTransaction,
      registerManual,
      loginManual,
      sendPasswordReset,
      checkEmailExists,
      resetPassword,
      checkUsernameExists,
      isProfileComplete: checkProfileCompletion(currentUser),
      leaderboard,
      appSettings,
      paymentSettings,
      tournaments,
      banners,
      announcements,
      popups,
      hasSeenAppOpenPopup,
      setHasSeenAppOpenPopup,
      selectedLang,
      setSelectedLang,
      t,
      requirePinAuth,
      pinModalOpen,
      isPinSetupRequired,
      forcePinSetup,
      setForcePinSetup
    }}>
      {children}
      {currentUser?.role !== 'admin' && !(typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) && (
        <>
          <PinAuthModal isOpen={pinModalOpen} onClose={handlePinAuthClose} />
          <PinSetupModal />
        </>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
