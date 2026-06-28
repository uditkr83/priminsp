import axios from "axios";

const API = axios.create({
  baseURL: "http://13.63.176.12:5000", // Tumhara AWS IP
  headers: {
    "Content-Type": "application/json",
  },
});

// YE LINE SABSE IMP HAI: Isko add karna mat bhoolna!
export default API;