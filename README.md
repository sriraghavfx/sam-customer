# ShopPulse AI: AI Customer Analyzer & Ecommerce SMS Recommendation Engine

An intelligent, full-stack ecommerce and customer analytics platform built for shop owners. It tracks customer transactions, performs RFM (Recency, Frequency, Monetary) segmentation, supports product image uploads, and automatically generates high-converting, personalized product recommendations dispatched via SMS.

---

## 🌟 Key Features

1. **Shop Owner Storefront & Inventory**:
   - Product catalog with live stock status and discount pricing.
   - Add new products with **instant image upload** or image URL.
   
2. **Customer Buying Intelligence (RFM)**:
   - Automated RFM calculations (Recency in days, Order Frequency, Lifetime Monetary value).
   - Dynamic customer segmentation (*VIP Champions*, *Loyal Buyers*, *At-Risk / Inactive*, *New Prospects*).

3. **AI Recommendation & Personalized SMS Copy**:
   - Analyzes customer purchase ledger + available catalog items.
   - Powered by **Google Gemini API** (with smart fallback heuristics).
   - Generates personalized SMS marketing messages constrained to under 160 characters.

4. **Live Virtual Phone SMS Simulator & Gateway**:
   - Interactive smartphone simulator displaying real-time character counters and message delivery.
   - Ready for integration with Fast2SMS, Twilio, or demo simulation.

5. **Predictive Sales Forecasting & Business Insights**:
   - AI-driven revenue trend projections and proactive churn alerts.

---

## 🚀 Quick Start

### 1. Launch Server
```bash
node server.js
```

### 2. Open in Browser
Visit [http://localhost:3000](http://localhost:3000)

### 3. Demo Credentials
- **Email**: `owner@shop.com`
- **Password**: `admin123`
- *(Or click the "1-Click Demo Shop Owner Login" button)*

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env`:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
FAST2SMS_API_KEY=your_fast2sms_key
```
