# sam-customer
AI-POWERED CUSTOMER ANALYZER RECOMMENDATION ENGINE &amp; STRATEGIC SUGGESTION SYSTEM web 
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev_secret")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///customer_ai.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
from models.database import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(15), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from models.database import db
from models.user import User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        phone = request.form['phone']
        password = request.form['password']

        if User.query.filter_by(email=email).first():
            flash("Email already registered!", "danger")
            return redirect(url_for('auth.register'))

        user = User(name=name, email=email, phone=phone)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        flash("Registration successful! Please login.", "success")
        return redirect(url_for('auth.login'))

    return render_template('register.html')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        user = User.query.filter_by(email=email).first()
        if user and user.check_password(password):
            session['user_id'] = user.id
            flash("Login successful!", "success")
            return redirect(url_for('profile'))
        else:
            flash("Invalid credentials!", "danger")

    return render_template('login.html')

@auth_bp.route('/logout')
def logout():
    session.pop('user_id', None)
    flash("Logged out successfully.", "info")
    return redirect(url_for('auth.login'))
from flask import Flask, render_template, session, redirect, url_for
from config import Config
from models.database import db
from routes.auth import auth_bp
from models.user import User

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

app.register_blueprint(auth_bp, url_prefix='/')

@app.route('/')
def index():
    return render_template('base.html')

@app.route('/profile')
def profile():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    user = User.query.get(session['user_id'])
    return render_template('profile.html', user=user)

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
<form method="POST">
  <input type="email" name="email" placeholder="Email" required>
  <input type="password" name="password" placeholder="Password" required>
  <button type="submit">Login</button>
</form>
<form method="POST">
  <input type="text" name="name" placeholder="Full Name" required>
  <input type="email" name="email" placeholder="Email" required>
  <input type="text" name="phone" placeholder="Phone" required>
  <input type="password" name="password" placeholder="Password" required>
  <button type="submit">Register</button>
</form>
from flask import Blueprint, render_template, session, redirect, url_for
from models.database import db
from models.user import User
from models.product import Product
from models.order import Order

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

# Admin login required decorator
def admin_required(func):
    def wrapper(*args, **kwargs):
        if 'admin_id' not in session:
            return redirect(url_for('auth.login'))
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper

@admin_bp.route('/dashboard')
@admin_required
def dashboard():
    total_customers = User.query.count()
    total_orders = Order.query.count()
    total_products = Product.query.count()
    total_revenue = db.session.query(db.func.sum(Order.total_amount)).scalar() or 0

    return render_template('admin/dashboard.html',
                           customers=total_customers,
                           orders=total_orders,
                           products=total_products,
                           revenue=total_revenue)

@admin_bp.route('/analytics')
@admin_required
def analytics():
    # Example data for charts
    sales_by_category = {"Electronics": 120000, "Fashion": 80000, "Books": 30000}
    monthly_sales = {"Jan": 20000, "Feb": 25000, "Mar": 30000, "Apr": 40000}

    return render_template('admin/analytics.html',
                           sales_by_category=sales_by_category,
                           monthly_sales=monthly_sales)
{% extends "base.html" %}
{% block content %}
<div class="container mt-4">
  <h2>Admin Dashboard</h2>
  <div class="row">
    <div class="col-md-3"><div class="card"><div class="card-body">Customers: {{ customers }}</div></div></div>
    <div class="col-md-3"><div class="card"><div class="card-body">Orders: {{ orders }}</div></div></div>
    <div class="col-md-3"><div class="card"><div class="card-body">Products: {{ products }}</div></div></div>
    <div class="col-md-3"><div class="card"><div class="card-body">Revenue: ₹{{ revenue }}</div></div></div>
  </div>
</div>
{% endblock %}
{% extends "base.html" %}
{% block content %}
<div class="container mt-4">
  <h2>Analytics</h2>
  <canvas id="salesCategoryChart"></canvas>
  <canvas id="monthlySalesChart"></canvas>
</div>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
  const salesByCategory = {{ sales_by_category|tojson }};
  const monthlySales = {{ monthly_sales|tojson }};

  new Chart(document.getElementById('salesCategoryChart'), {
    type: 'pie',
    data: {
      labels: Object.keys(salesByCategory),
      datasets: [{ data: Object.values(salesByCategory), backgroundColor: ['#3b82f6','#9333ea','#f59e0b'] }]
    }
  });

  new Chart(document.getElementById('monthlySalesChart'), {
    type: 'line',
    data: {
      labels: Object.keys(monthlySales),
      datasets: [{ data: Object.values(monthlySales), label: 'Monthly Sales', borderColor: '#10b981', fill: false }]
    }
  });
</script>
{% endblock %}
from flask import Blueprint, render_template, request, session, redirect, url_for
from models.database import db
from models.user import User
from models.order import Order
from models.transaction import Transaction

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

def admin_required(func):
    def wrapper(*args, **kwargs):
        if 'admin_id' not in session:
            return redirect(url_for('auth.login'))
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper

@admin_bp.route('/customers')
@admin_required
def customers():
    search = request.args.get('search')
    if search:
        customers = User.query.filter(User.name.like(f"%{search}%")).all()
    else:
        customers = User.query.all()
    return render_template('admin/customers.html', customers=customers)

@admin_bp.route('/customers/<int:customer_id>')
@admin_required
def customer_details(customer_id):
    customer = User.query.get_or_404(customer_id)
    orders = Order.query.filter_by(customer_id=customer.id).all()
    transactions = Transaction.query.filter_by(customer_id=customer.id).all()

    # Example RFM calculation
    recency = min([(session['today'] - t.invoice_date).days for t in transactions]) if transactions else None
    frequency = len(orders)
    monetary = sum([o.total_amount for o in orders])

    rfm = {"Recency": recency, "Frequency
    {% extends "base.html" %}
{% block content %}
<div class="container mt-4">
  <h2>Customers</h2>
  <form method="GET">
    <input type="text" name="search" placeholder="Search by name">
    <button type="submit">Search</button>
  </form>
  <table class="table mt-3">
    <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead>
    <tbody>
      {% for c in customers %}
      <tr>
        <td>{{ c.id }}</td>
        <td>{{ c.name }}</td>
        <td>{{ c.email }}</td>
        <td>{{ c.phone }}</td>
        <td><a href="{{ url_for('admin.customer_details', customer_id=c.id) }}">View</a></td>
      </tr>
      {% endfor %}
    </tbody>
  </table>
</div>
{% endblock %}
{% extends "base.html" %}
{% block content %}
<div class="container mt-4">
  <h2>Customer Profile</h2>
  <p><strong>Name:</strong> {{ customer.name }}</p>
  <p><strong>Email:</strong> {{ customer.email }}</p>
  <p><strong>Phone:</strong> {{ customer.phone }}</p>

  <h3>RFM Analysis</h3>
  <ul>
    <li>Recency: {{ rfm.Recency }}</li>
    <li>Frequency: {{ rfm.Frequency }}</li>
    <li>Monetary: ₹{{ rfm.Monetary }}</li>
  </ul>

  <h3>Orders</h3>
  <table class="table">
    <thead><tr><th>ID</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
    <tbody>
      {% for o in orders %}
      <tr><td>{{ o.id }}</td><td>{{ o.order_date }}</td><td>₹{{ o.total_amount }}</td><td>{{ o.status }}</td></tr>
      {% endfor %}
    </tbody>
  </table>

  <h3>Transactions</h3>
  <table class="table">
    <thead><tr><th>Date</th><th>Product</th><th>Qty</th><th>Price</th></tr></thead>
    <tbody>
      {% for t in transactions %}
      <tr><td>{{ t.invoice_date }}</td><td>{{ t.product_id }}</td><td>{{ t.quantity }}</td><td>₹{{ t.unit_price }}</td></tr>
      {% endfor %}
    </tbody>
  </table>
</div>
{% endblock %}
from flask import Blueprint, render_template, request, redirect, url_for, flash
from models.database import db
from models.user import User
from models.transaction import Transaction
from services.sms_service import send_sms_recommendation
from ml.recommendation import recommend_products

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

@admin_bp.route('/customers/<int:customer_id>/sms', methods=['POST'])
def send_customer_sms(customer_id):
    customer = User.query.get_or_404(customer_id)
    # Generate recommendations
    transactions = Transaction.query.filter_by(customer_id=customer.id).all()
    recommendations = recommend_products(customer.id, pd.DataFrame([t.to_dict() for t in transactions]))

    if recommendations.empty:
        flash("No recommendations available for this customer.", "warning")
        return redirect(url_for('admin.customer_details', customer_id=customer.id))

    # Pick top recommendation
    top_product = recommendations.index[0]
    message = f"Hi {customer.name}! Based on your recent purchases, we think you'll love {top_product}. Visit our shop today!"

    status = send_sms_recommendation(customer.phone, message)

    flash(f"SMS sent to {customer.name}: {status}", "success")
    return redirect(url_for('admin.customer_details', customer_id=customer.id))
<h3>Send Recommendation SMS</h3>
<form method="POST" action="{{ url_for('admin.send_customer_sms', customer_id=customer.id) }}">
  <button type="submit" class="btn btn-primary">Send SMS Recommendation</button>
</form>
from flask import Blueprint, render_template, request, redirect, url_for, flash
from models.database import db
from models.user import User
from models.transaction import Transaction
from services.sms_service import send_sms_recommendation
from ml.recommendation import recommend_products
from models.sms_campaign import SMSCampaign
import pandas as pd

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

@admin_bp.route('/sms')
def sms_dashboard():
    campaigns = SMSCampaign.query.order_by(SMSCampaign.date.desc()).all()
    total_sent = SMSCampaign.query.filter_by(status="Sent successfully").count()
    total_failed = SMSCampaign.query.filter(SMSCampaign.status.like("Failed%")).count()
    total_demo = SMSCampaign.query.filter(SMSCampaign.status.like("DEMO%")).count()

    return render_template('admin/sms.html',
                           campaigns=campaigns,
                           total_sent=total_sent,
                           total_failed=total_failed,
                           total_demo=total_demo)

@admin_bp.route('/sms/send/<int:customer_id>', methods=['POST'])
def send_sms(customer_id):
    customer = User.query.get_or_404(customer_id)
    transactions = Transaction.query.filter_by(customer_id=customer.id).all()
    df = pd.DataFrame([t.to_dict() for t in transactions])
    recommendations = recommend_products(customer.id, df)

    if recommendations.empty:
        flash("No recommendations available.", "warning")
        return redirect(url_for('admin.sms_dashboard'))

    top_product = recommendations.index[0]
    message = f"Hi {customer.name}! Based on your purchases, we recommend {top_product}. Visit our shop today!"

    status = send_sms_recommendation(customer.phone, message)

    campaign = SMSCampaign(customer_id=customer.id,
                           product=top_product,
                           phone=customer.phone,
                           message=message,
                           status=status)
    db.session.add(campaign)
    db.session.commit()

    flash(f"SMS campaign logged: {status}", "success")
    return redirect(url_for('admin.sms_dashboard'))
from models.database import db
from datetime import datetime

class SMSCampaign(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, nullable=False)
    product = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(15), nullable=False)
    message = db.Column(db.Text, nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(50), nullable=False)
{% extends "base.html" %}
{% block content %}
<div class="container mt-4">
  <h2>SMS Campaign Dashboard</h2>
  <div class="row mb-3">
    <div class="col-md-4"><div class="card"><div class="card-body">Total Sent: {{ total_sent }}</div></div></div>
    <div class="col-md-4"><div class="card"><div class="card-body">Failed: {{ total_failed }}</div></div></div>
    <div class="col-md-4"><div class="card"><div class="card-body">Demo Messages: {{ total_demo }}</div></div></div>
  </div>

  <table class="table table-striped">
    <thead><tr><th>Date</th><th>Customer</th><th>Product</th><th>Phone</th><th>Message</th><th>Status</th></tr></thead>
    <tbody>
      {% for c in campaigns %}
      <tr>
        <td>{{ c.date }}</td>
        <td>{{ c.customer_id }}</td>
        <td>{{ c.product }}</td>
        <td>{{ c.phone }}</td>
        <td>{{ c.message }}</td>
        <td>{{ c.status }}</td>
      </tr>
      {% endfor %}
    </tbody>
  </table>
</div>
{% endblock %}
@admin_bp.route('/strategies')
@admin_required
def strategies():
    # Example insights (these would be generated dynamically from RFM + segmentation)
    insights = [
        {
            "title": "Customer Alert",
            "description": "28 customers are at risk.",
            "action": "Send a 15% win-back SMS campaign."
        },
        {
            "title": "VIP Opportunity",
            "description": "18 customers are classified as high-value VIPs.",
            "action": "Offer exclusive loyalty rewards."
        },
        {
            "title": "Sales Opportunity",
            "description": "Customers frequently buying mobile accessories may be interested in related products.",
            "action": "Create a cross-selling campaign."
        }
    ]
    return render_template('admin/strategies.html', insights=insights)
{% extends "base.html" %}
{% block content %}
<div class="container mt-4">
  <h2>Business Insights</h2>
  <div class="row">
    {% for i in insights %}
    <div class="col-md-4">
      <div class="card shadow-sm mb-3">
        <div class="card-body">
          <h5 class="card-title">{{ i.title }}</h5>
          <p class="card-text">{{ i.description }}</p>
          <p><strong>Recommended Action:</strong> {{ i.action }}</p>
        </div>
      </div>
    </div>
    {% endfor %}
  </div>
</div>
{% endblock %}
@admin_bp.route('/strategies')
@admin_required
def strategies():
    insights = [
        {"title": "Customer Alert", "description": "28 customers are at risk.", "action": "Send a 15% win-back SMS campaign."},
        {"title": "VIP Opportunity", "description": "18 customers are classified as high-value VIPs.", "action": "Offer exclusive loyalty rewards."},
        {"title": "Sales Opportunity", "description": "Customers frequently buying mobile accessories may be interested in related products.", "action": "Create a cross-selling campaign."}
    ]

    # Example analytics data
    segment_distribution = {"VIP": 18, "At-Risk": 28, "Frequent Buyers": 40, "Budget Hunters": 22}
    revenue_by_segment = {"VIP": 120000, "Frequent Buyers": 80000, "At-Risk": 30000, "Budget Hunters": 20000}

    return render_template('admin/strategies.html',
                           insights=insights,
                           segment_distribution=segment_distribution,
                           revenue_by_segment=revenue_by_segment)
{% extends "base.html" %}
{% block content %}
<div class="container mt-4">
  <h2>Business Insights</h2>
  <div class="row">
    {% for i in insights %}
    <div class="col-md-4">
      <div class="card shadow-sm mb-3">
        <div class="card-body">
          <h5 class="card-title">{{ i.title }}</h5>
          <p class="card-text">{{ i.description }}</p>
          <p><strong>Recommended Action:</strong> {{ i.action }}</p>
        </div>
      </div>
    </div>
    {% endfor %}
  </div>

  <h3 class="mt-4">Visual Analytics</h3>
  <canvas id="segmentChart"></canvas>
  <canvas id="revenueChart" class="mt-4"></canvas>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
  const segmentData = {{ segment_distribution|tojson }};
  const revenueData = {{ revenue_by_segment|tojson }};

  new Chart(document.getElementById('segmentChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(segmentData),
      datasets: [{ data: Object.values(segmentData), backgroundColor: ['#3b82f6','#f59e0b','#10b981','#9333ea'] }]
    }
  });

  new Chart(document.getElementById('revenueChart'), {
    type: 'bar',
    data: {
      labels: Object.keys(revenueData),
      datasets: [{ data: Object.values(revenueData), label: 'Revenue by Segment', backgroundColor: '#3b82f6' }]
    }
  });
</script>
{% endblock %}
import pandas as pd
from sklearn.linear_model import LinearRegression
import numpy as np

@admin_bp.route('/strategies')
@admin_required
def strategies():
    insights = [
        {"title": "Customer Alert", "description": "28 customers are at risk.", "action": "Send a 15% win-back SMS campaign."},
        {"title": "VIP Opportunity", "description": "18 customers are classified as high-value VIPs.", "action": "Offer exclusive loyalty rewards."},
        {"title": "Sales Opportunity", "description": "Customers frequently buying mobile accessories may be interested in related products.", "action": "Create a cross-selling campaign."}
    ]

    # Example historical monthly sales data
    monthly_sales = {"Jan": 20000, "Feb": 25000, "Mar": 30000, "Apr": 40000, "May": 38000, "Jun": 42000}

    # Forecast next 3 months using Linear Regression
    months = np.arange(len(monthly_sales)).reshape(-1, 1)
    values = np.array(list(monthly_sales.values()))
    model = LinearRegression().fit(months, values)
    future_months = np.arange(len(monthly_sales), len(monthly_sales)+3).reshape(-1, 1)
    forecast = model.predict(future_months)

    forecast_labels = ["Jul", "Aug", "Sep"]
    forecast_data = dict(zip(forecast_labels, forecast.astype(int)))

    return render_template('admin/strategies.html',
                           insights=insights,
                           monthly_sales=monthly_sales,
                           forecast_data=forecast_data)
{% extends "base.html" %}
{% block content %}
<div class="container mt-4">
  <h2>Business Insights</h2>
  <div class="row">
    {% for i in insights %}
    <div class="col-md-4">
      <div class="card shadow-sm mb-3">
        <div class="card-body">
          <h5 class="card-title">{{ i.title }}</h5>
          <p class="card-text">{{ i.description }}</p>
          <p><strong>Recommended Action:</strong> {{ i.action }}</p>
        </div>
      </div>
    </div>
    {% endfor %}
  </div>

  <h3 class="mt-4">Predictive Sales Forecasting</h3>
  <canvas id="forecastChart"></canvas>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
  const monthlySales = {{ monthly_sales|tojson }};
  const forecastData = {{ forecast_data|tojson }};

  new Chart(document.getElementById('forecastChart'), {
    type: 'line',
    data: {
      labels: [...Object.keys(monthlySales), ...Object.keys(forecastData)],
      datasets: [
        {
          label: 'Historical Sales',
          data: Object.values(monthlySales),
          borderColor: '#3b82f6',
          fill: false
        },
        {
          label: 'Forecast',
          data: [...Array(Object.keys(monthlySales).length).fill(null), ...Object.values(forecastData)],
          borderColor: '#f59e0b',
          borderDash: [5,5],
          fill: false
        }
      ]
    }
  });
</script>
{% endblock %}
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA

@admin_bp.route('/strategies')
@admin_required
def strategies():
    insights = [
        {"title": "Customer Alert", "description": "28 customers are at risk.", "action": "Send a 15% win-back SMS campaign."},
        {"title": "VIP Opportunity", "description": "18 customers are classified as high-value VIPs.", "action": "Offer exclusive loyalty rewards."},
        {"title": "Sales Opportunity", "description": "Customers frequently buying mobile accessories may be interested in related products.", "action": "Create a cross-selling campaign."}
    ]

    # Example monthly sales data
    monthly_sales = {"Jan": 20000, "Feb": 25000, "Mar": 30000, "Apr": 40000, "May": 38000, "Jun": 42000}
    sales_series = pd.Series(list(monthly_sales.values()))

    # Fit ARIMA model (p,d,q = 1,1,1 for demo)
    model = ARIMA(sales_series, order=(1,1,1))
    model_fit = model.fit()

    # Forecast next 3 months
    forecast = model_fit.forecast(steps=3)
    forecast_labels = ["Jul", "Aug", "Sep"]
    forecast_data = dict(zip(forecast_labels, forecast.astype(int)))

    return render_template('admin/strategies.html',
                           insights=insights,
                           monthly_sales=monthly_sales,
                           forecast_data=forecast_data)
from prophet import Prophet

# Prepare data
df = pd.DataFrame({
    'ds': pd.date_range(start="2026-01-01", periods=6, freq='M'),
    'y': [20000, 25000, 30000, 40000, 38000, 42000]
})

model = Prophet()
model.fit(df)

future = model.make_future_dataframe(periods=3, freq='M')
forecast = model.predict(future)

# Extract last 3 forecast points
forecast_data = dict(zip(["Jul","Aug","Sep"], forecast['yhat'][-3:].astype(int)))
<h3 class="mt-4">Predictive Sales Forecasting</h3>
<canvas id="forecastChart"></canvas>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
  const monthlySales = {{ monthly_sales|tojson }};
  const forecastData = {{ forecast_data|tojson }};

  new Chart(document.getElementById('forecastChart'), {
    type: 'line',
    data: {
      labels: [...Object.keys(monthlySales), ...Object.keys(forecastData)],
      datasets: [
        {
          label: 'Historical Sales',
          data: Object.values(monthlySales),
          borderColor: '#3b82f6',
          fill: false
        },
        {
          label: 'Forecast (ARIMA/Prophet)',
          data: [...Array(Object.keys(monthlySales).length).fill(null), ...Object.values(forecastData)],
          borderColor: '#f59e0b',
          borderDash: [5,5],
          fill: false
        }
      ]
    }
  });
</script>
