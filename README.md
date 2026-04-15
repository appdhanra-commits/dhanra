# Dhanra - Financial Dashboard SaaS

## Overview
Production-ready financial dashboard with customer management, cluster organization, and payment tracking.

## Features
- **Responsive Design**: Works seamlessly on PC and mobile devices
- **Customer Management**: Add, edit, and track customer payments
- **Cluster Organization**: Group customers into payment clusters
- **Real-time Analytics**: Payment trends and collection metrics
- **Secure Authentication**: License-based access control
- **Production Architecture**: Cache system with lazy loading

## Technology Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **Deployment**: Render (Backend), Static Hosting (Frontend)

## Responsive Design
- **Desktop**: Full dashboard with metrics grid and charts
- **Tablet**: Adaptive layout with reorganized navigation
- **Mobile**: Stacked layout with touch-friendly controls

## API Endpoints
- `GET /api/license/status` - Verify license status
- `GET /api/customers/metrics` - Get dashboard metrics
- `GET /api/customers` - List all customers
- `POST /api/customers` - Add new customer
- `GET /api/clusters/business/:id` - Get business clusters
- `POST /api/clusters` - Create new cluster

## Environment Variables
```env
PORT=5000
MONGODB_URI=mongodb://connection_string
ADMIN_KEY=your_admin_key
```

## Database Connection
MongoDB Atlas cluster with SSL and replica set configuration for production reliability.

## Deployment Instructions

### Backend (Render)
1. Connect repository to Render
2. Set environment variables
3. Deploy - Render will auto-detect Node.js

### Frontend (Static Hosting)
1. Build static files
2. Deploy to Vercel/Netlify/GitHub Pages
3. Update API base URL in production

## Security Features
- License-based authentication
- CORS protection
- Input sanitization
- SQL injection prevention
- XSS protection

## Performance Features
- Lazy loading with cache system
- Optimized API calls
- Responsive image handling
- Minimal bundle size

## Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Mobile Responsiveness
- Breakpoints: 1200px, 920px, 768px, 480px
- Touch-friendly interface
- Optimized for mobile browsers
- No horizontal scrolling

## License
Commercial SaaS License - Contact for enterprise deployment

## Support
For deployment issues and feature requests, contact development team.
