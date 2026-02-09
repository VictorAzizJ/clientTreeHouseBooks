# Sidewalk Inventory System - User Guide

## Overview

The Sidewalk Inventory System provides unified tracking for all sidewalk book distribution locations. It manages weekly inventory counts across four categories, all using the same formulas for consistent reporting and analysis.

**Key Benefits:**
- Track inventory across multiple sidewalk locations
- Consistent formulas ensure accurate comparisons between categories
- Live calculations show trends and restock needs
- Centralized dashboard for quick overview

---

## Four Sidewalk Categories

| Category | Icon | Description |
|----------|------|-------------|
| **Carts** | 🛒 | Mobile book carts for sidewalk distribution |
| **Stacks** | 📚 | Book stacks at fixed sidewalk locations |
| **Readers** | 📖 | Books distributed to individual readers |
| **Little Tree House** | 🏠 | Little free library tree house locations |

All four categories share the same tracking structure and formulas, ensuring consistent data analysis across the entire sidewalk program.

---

## Accessing Sidewalk Inventory

### From the Navigation Bar

1. Click on **Books** in the main navigation
2. Look for the **Sidewalk Inventory** section
3. Choose from:
   - **All Categories** - Main dashboard
   - **Carts** - Cart inventory only
   - **Stacks** - Stack inventory only
   - **Readers** - Reader inventory only
   - **Little Tree House** - Tree house inventory only

### Direct URLs

| Page | URL |
|------|-----|
| Dashboard | `/sidewalk` |
| Carts | `/sidewalk/carts` |
| Stacks | `/sidewalk/stacks` |
| Readers | `/sidewalk/readers` |
| Little Tree House | `/sidewalk/littleTreeHouse` |

---

## The Sidewalk Dashboard

The main dashboard (`/sidewalk`) displays all four categories at a glance.

### Category Cards

Each category card shows:
- **Category name and description**
- **Latest week date** - Most recent recorded week
- **Current count** - End of week inventory
- **Weekly change** - Books added or distributed
- **Total records** - Historical data count

### Quick Actions

From each card, you can:
- **View Records** - See all historical data for that category
- **Add Week** - Record a new week's inventory

---

## Recording Weekly Inventory

### Step 1: Navigate to the Category

Go to the specific category you want to record:
- Click "Add Week" from the dashboard, OR
- Go to `/sidewalk/[category]/new`

### Step 2: Enter Week Dates

- **Week Start (Monday)**: The Monday of the week
- **Week End (Sunday)**: Auto-calculates to Sunday

The system defaults to the current week, but you can change the dates.

### Step 3: Enter Counts

| Field | Description | Required |
|-------|-------------|----------|
| **Start Count** | Number of books at the beginning of the week | Yes |
| **End Count** | Number of books at the end of the week | Yes |
| **Target Count** | Ideal inventory level (default: 50) | No |

### Step 4: Optional Fields

| Field | Description |
|-------|-------------|
| **Location** | Specific location (e.g., "Corner of Main St and Oak Ave") |
| **Notes** | Any additional notes about this week |

### Step 5: Review Calculations

The form displays **live calculated values** as you type:

```
┌─────────────────────────────────────────────┐
│  Calculated Values (Live Preview)           │
├─────────────────────────────────────────────┤
│  Change:            +15 (added)             │
│  Percentage Change: +30.0%                  │
│  Distribution Rate: N/A (no distribution)   │
│  Restock Needed:    None (at target)        │
│  Trend:             ↑ Increasing            │
└─────────────────────────────────────────────┘
```

### Step 6: Save

Click **Save Record** to store the data.

---

## Shared Formulas

All four sidewalk categories use identical formulas. This ensures consistent tracking and reporting.

### Formula Definitions

#### 1. Change
```
change = endCount - startCount
```
- **Positive value**: Books were added to inventory
- **Negative value**: Books were distributed/taken
- **Zero**: No change in inventory

#### 2. Percentage Change
```
percentChange = ((endCount - startCount) / startCount) × 100
```
- Shows relative change as a percentage
- Returns N/A if start count is zero (avoids division by zero)

#### 3. Distribution Rate
```
distributionRate = |change| / 7 days
```
- Only calculated when books were distributed (negative change)
- Shows average books distributed per day
- Useful for planning restocking frequency

#### 4. Restock Needed
```
restockNeeded = targetCount - endCount
```
- Shows how many books to add to reach target
- Returns zero if already at or above target
- Default target is 50 books

#### 5. Trend
```
trend =
  - "increasing" if change > 0
  - "decreasing" if change < 0
  - "stable" if change = 0
```
- Visual indicator of inventory direction
- Displayed as arrows: ↑ ↓ →

### Formula Examples

| Start | End | Target | Change | % Change | Rate | Restock | Trend |
|-------|-----|--------|--------|----------|------|---------|-------|
| 50 | 35 | 50 | -15 | -30% | 2.1/day | 15 | ↓ Decreasing |
| 40 | 55 | 50 | +15 | +37.5% | N/A | 0 | ↑ Increasing |
| 50 | 50 | 50 | 0 | 0% | N/A | 0 | → Stable |
| 0 | 25 | 50 | +25 | N/A | N/A | 25 | ↑ Increasing |

---

## Viewing Historical Records

### Category List View

Navigate to any category (e.g., `/sidewalk/carts`) to see all historical records.

#### Table Columns

| Column | Description |
|--------|-------------|
| **Week** | Date range (Mon - Sun) |
| **Start** | Beginning inventory count |
| **End** | Ending inventory count |
| **Change** | Calculated change with color indicator |
| **% Change** | Percentage change |
| **Trend** | Visual trend indicator (↑ ↓ →) |
| **Location** | Optional location field |
| **Notes** | Truncated notes (hover for full text) |
| **Actions** | Edit button |

#### Color Coding

- **Green badge**: Positive change (books added)
- **Yellow/Orange badge**: Negative change (books distributed)
- **Gray badge**: No change

---

## Editing Records

### Step 1: Find the Record

Go to the category list and click **Edit** on the record you want to modify.

### Step 2: Update Values

All fields are editable:
- Week dates
- Start and end counts
- Target count
- Location
- Notes

### Step 3: Review and Save

The live formula preview updates as you make changes. Click **Update Record** to save.

---

## Formula Synchronization

The system includes a synchronization check to ensure formula consistency.

### Checking Sync Status

From the dashboard, click **Check Formula Sync** to verify all categories are calculating correctly.

#### Success Response
```
✓ All formulas synchronized correctly
```

#### Warning Response
```
⚠ Found 2 inconsistency(ies)
```

If inconsistencies are found, they are logged to the console for administrator review.

### API Endpoint

```
GET /sidewalk/api/sync
```

Returns:
```json
{
  "success": true,
  "inconsistencies": [],
  "message": "All formulas synchronized correctly"
}
```

---

## Best Practices

### Weekly Recording

1. **Record consistently**: Same day each week (e.g., every Monday)
2. **Count accurately**: Physical count of all books
3. **Note anomalies**: Use the notes field for unusual events
4. **Set realistic targets**: Adjust target count based on location traffic

### Location Tracking

For categories with multiple physical locations (Carts, Little Tree House):
- Use the **Location** field to specify which cart or tree house
- Consider creating separate records for high-traffic locations

### Trend Analysis

- Review weekly trends to identify patterns
- High distribution rates may indicate popular locations
- Consistent restock needs help plan inventory allocation

---

## Access Control

| Role | Permissions |
|------|-------------|
| **Admin** | Full access: view, create, edit all records |
| **Staff** | Full access: view, create, edit all records |
| **Volunteer** | No access to sidewalk inventory |

Sidewalk inventory is also accessible in **Front Desk Mode**.

---

## Troubleshooting

### "A record for this week already exists in this category"

**Cause**: You're trying to create a duplicate record for the same week.

**Solution**: Edit the existing record instead, or choose a different week.

### "Invalid category"

**Cause**: The URL contains an invalid category name.

**Solution**: Use one of the valid categories: `carts`, `stacks`, `readers`, `littleTreeHouse`

### Formulas show "N/A"

**Cause**: Certain calculations can't be performed (e.g., division by zero).

**Solution**: This is expected behavior. The specific reason is displayed (e.g., "N/A (start is 0)").

### Changes not showing in dashboard

**Cause**: Browser caching or session issues.

**Solution**: Refresh the page or clear browser cache.

---

## Quick Reference

```
┌────────────────────────────────────────────────────────────┐
│          SIDEWALK INVENTORY - QUICK REFERENCE              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  CATEGORIES:                                               │
│    • Carts         - Mobile distribution carts             │
│    • Stacks        - Fixed location stacks                 │
│    • Readers       - Individual reader distribution        │
│    • Little Tree House - Free library tree houses          │
│                                                            │
│  SHARED FORMULAS:                                          │
│    Change        = End - Start                             │
│    % Change      = ((End - Start) / Start) × 100           │
│    Distribution  = |Change| / 7 days                       │
│    Restock       = Target - End                            │
│                                                            │
│  KEY URLS:                                                 │
│    Dashboard:    /sidewalk                                 │
│    Category:     /sidewalk/[category]                      │
│    Add Record:   /sidewalk/[category]/new                  │
│    Edit Record:  /sidewalk/[category]/[id]/edit            │
│                                                            │
│  ACCESS: Staff and Admin only                              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Data Model Reference

### SidewalkInventory Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `category` | String | Yes | One of: carts, stacks, readers, littleTreeHouse |
| `weekStart` | Date | Yes | Monday of the week |
| `weekEnd` | Date | Yes | Sunday of the week |
| `startCount` | Number | Yes | Start of week inventory |
| `endCount` | Number | Yes | End of week inventory |
| `targetCount` | Number | No | Target inventory level (default: 50) |
| `location` | String | No | Specific location description |
| `notes` | String | No | Additional notes (max 1000 chars) |
| `recordedBy` | ObjectId | No | User who recorded the data |
| `createdAt` | Date | Auto | Record creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

### Virtual Fields (Calculated)

| Field | Calculation |
|-------|-------------|
| `change` | `endCount - startCount` |
| `percentChange` | `((endCount - startCount) / startCount) * 100` |
| `distributionRate` | `Math.abs(change) / 7` |
| `restockNeeded` | `Math.max(0, targetCount - endCount)` |
| `trend` | `'increasing'` / `'decreasing'` / `'stable'` |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | February 2026 | Initial release with 4 unified categories |

---

*Document created for TreeHouseBooks Staff and Admin Users*
