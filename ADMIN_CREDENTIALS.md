# Pentasent - Admin Credentials & App Guide

## Admin Access

Use these credentials to access the full app prototype:

**Admin Email:** `admin@pentasent.com`
**Admin Password:** `PentasentAdmin2026!`

**Note:** The admin user is automatically created in the database, so you can login directly without registering first.

When you login with these credentials, you'll get access to the complete working prototype with all features enabled.

## Regular User Experience

Regular users (non-admin) will see a "Coming Soon" screen after logging in, which includes:
- Welcome message with their name
- Information about upcoming features
- Confirmation that their email is saved for notifications

## App Features (Admin Access Only)

### 1. Authentication
- User registration with name, email, and password
- Login functionality
- Data stored in Supabase database
- Automatic admin detection

### 2. Chats/Consultations
- View all skin consultations
- Start new consultations
- Upload images for skin analysis
- AI-powered diagnosis (dummy data simulation)
- Disease identification with severity levels
- Personalized precautions
- Product recommendations
- Create skincare routines from consultations

### 3. Routines
- View all active routines
- Progress tracking (tasks completed/total)
- Days remaining counter
- Daily task checklists
- Mark tasks as complete
- Upload progress photos
- Progress feedback

### 4. Shopping
- Browse 10 skincare products
- Add to cart functionality
- Quantity management
- View cart with totals
- Product categories and descriptions
- Checkout (shows "coming soon" alert)

### 5. Profile
- User information display
- Statistics (total chats, routines, cart items)
- Account details
- App information
- Contact details
- Logout functionality

### 6. Notifications
- Real-time notification system
- Account creation notifications
- Routine creation notifications
- Unread badge counter
- Mark as read functionality

## Dummy Data

### Diseases (10 skin conditions):
1. Acne Vulgaris
2. Eczema (Atopic Dermatitis)
3. Rosacea
4. Psoriasis
5. Melasma
6. Contact Dermatitis
7. Seborrheic Dermatitis
8. Sun Damage (Photoaging)
9. Dry Skin (Xerosis)
10. Fungal Infection (Tinea)

### Products (10 items):
1. Gentle Daily Cleanser - $24.99
2. Hydrating Facial Serum - $39.99
3. Mineral Sunscreen SPF 50 - $32.99
4. Nourishing Night Cream - $44.99
5. Vitamin C Brightening Serum - $48.99
6. Exfoliating Toner - $28.99
7. Calming Face Mask - $26.99
8. Retinol Night Treatment - $54.99
9. Eye Cream Complex - $36.99
10. Lip Repair Balm - $14.99

## App Flow

### For Investors Demo (Admin Login):

1. **Login** with admin credentials
2. **Home/Chats** - Start a new consultation
3. **Upload Image** - Select any image
4. **AI Analysis** - Watch the AI process and diagnose
5. **Create Routine** - Generate a 7-day skincare routine
6. **View Routine** - See tasks and track progress
7. **Shopping** - Browse and add products to cart
8. **Profile** - View user statistics and information

### For Regular Users:

1. **Register** - Create new account
2. **Login** - Access the app
3. **Coming Soon Screen** - See message about features under development
4. Email saved for future notifications

## Design Theme

The app uses a clean, calming skincare-inspired color palette:
- Primary: Soft pink/rose (#E8B4B8)
- Secondary: Mint green (#A8D5BA)
- Accent: Warm cream (#F9E5D8)
- Background: Off-white (#FFFBF7)

All components feature:
- Smooth animations
- Soft shadows
- Rounded corners
- Clean typography
- Professional medical aesthetic

## Technical Stack

- **Framework:** React Native with Expo
- **Navigation:** Expo Router (file-based routing)
- **Database:** Supabase (PostgreSQL)
- **Animations:** react-native-reanimated
- **Icons:** lucide-react-native
- **State Management:** React Context API
- **Storage:** AsyncStorage for local data
- **Image Picker:** expo-image-picker

## Important Notes

- The app is fully functional for demo purposes
- All disease diagnoses are randomly selected from dummy data
- Payment processing shows "coming soon" alert
- Progress photos trigger encouragement messages
- Admin access is granted automatically by email/password match
- Regular users only see the coming soon screen
- All data persists across sessions using AsyncStorage
- Notifications are generated for key actions

## Testing the App

To test all features:
1. Use admin credentials to login
2. Create a new consultation
3. Upload an image (any image works)
4. Wait for AI analysis to complete
5. Create a routine from the consultation
6. Go to routines tab and open the routine
7. Complete tasks and upload progress photo
8. Browse shopping and add items to cart
9. Check profile to see statistics
10. View notifications to see activity log
