import axios from 'axios';

if (!process.env.CRM_API_BASE_URL) {
  console.error("🚨 FATAL ERROR: CRM_API_BASE_URL is missing in .env file!");
}

export const crmClient = axios.create({
  baseURL: process.env.CRM_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.INTERNAL_CRM_SECRET
  }
});