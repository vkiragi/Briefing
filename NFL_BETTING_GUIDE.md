# NFL Betting Features Guide

## Overview
The application now includes comprehensive NFL betting features with support for the three most popular bet types: Moneyline, Point Spread, and Total Score (Over/Under).

## Features Added

### 1. **Moneyline Bets**
Bet on which team will win the game outright.

**How to use:**
1. Select "NFL" as the sport
2. Choose "Moneyline" as the bet type
3. Select a game from the upcoming games sidebar
4. Click on the team you want to bet on
5. Enter the odds and stake amount
6. Submit the bet

**Example:** Betting on the Kansas City Chiefs to win against the Buffalo Bills.

---

### 2. **Point Spread Bets**
Bet on a team to cover the spread (favorites must win by more than the spread, underdogs must lose by less or win).

**How to use:**
1. Select "NFL" as the sport
2. Choose "Spread" as the bet type
3. Select a game from the upcoming games sidebar
4. Click on the team you want to bet on
5. Enter the point spread (negative for favorites, positive for underdogs)
   - Example: `-7.5` for a 7.5-point favorite
   - Example: `+3.5` for a 3.5-point underdog
6. Enter the odds and stake amount
7. Submit the bet

**Example:** Chiefs -7.5 at -110 odds for $100 stake

---

### 3. **Total Score (Over/Under) Bets**
Bet on whether the combined score of both teams will be over or under a specific line.

**How to use:**
1. Select "NFL" as the sport
2. Choose "Total" as the bet type
3. Select a game from the upcoming games sidebar
4. Choose "Over" or "Under"
5. Enter the total line (e.g., `47.5`)
6. Enter the odds and stake amount
7. Submit the bet

**Example:** Over 47.5 at -110 odds for $50 stake

---

## User Interface Enhancements

### Game Selection Sidebar
- Displays upcoming NFL games automatically
- Click on any game to auto-fill the matchup field
- Games are fetched from ESPN's public API

### Bet Type Information Cards
- Each bet type shows helpful information when selected
- Blue card for Moneyline
- Purple card for Spread
- Green card for Total

### Interactive Team Selection
- Large, clickable buttons for each team
- Visual feedback when a team is selected
- Auto-populates the selection field based on your choices

### Form Validation
- Ensures all required fields are filled before submission
- Prevents incomplete bets from being placed
- Helpful error messages guide you to complete the form

### Bet Preview
- Shows your complete bet selection before submission
- Displays in an accent-colored box for easy visibility
- Example: "Kansas City Chiefs -7.5" or "Over 47.5"

---

## Default Settings
- NFL is now the default sport when adding a new bet
- Moneyline is the default bet type
- Default odds are set to -110 (standard American odds)

---

## Tips for Using the System

1. **Quick Bet Entry**: Select a game from the sidebar first - it will auto-fill the matchup and date
2. **Odds Format**: Enter American odds (e.g., -110, +150, -200)
3. **Stake Amount**: Enter your wager amount in dollars
4. **Sportsbook**: Optional field to track which book you placed the bet at
5. **Manual Entry**: You can still manually enter matchup and selection if needed

---

## Tracking Your Bets

After placing bets, you can:
- View them on the Dashboard (Recent Bets section)
- See detailed history in the Bet History page
- Filter by status (Pending, Won, Lost, Pushed)
- Search by team name or matchup
- Update bet status as games complete

---

## Example Workflow

1. Navigate to "Add Bet" page
2. NFL is already selected (default)
3. Browse upcoming games in the sidebar
4. Click on "Chiefs @ Bills"
5. Select "Spread" as bet type
6. Click on "Chiefs"
7. Enter "-7.5" for the spread
8. Enter "-110" for odds
9. Enter "$100" for stake
10. Review the preview: "Kansas City Chiefs -7.5"
11. Click "Place Bet"
12. Bet is saved and appears in your dashboard

---

## Supported Sports

While this guide focuses on NFL, the application also supports:
- NBA (Basketball)
- MLB (Baseball)
- NHL (Hockey)
- NCAA Football (NCAAF)
- NCAA Basketball (NCAAB)
- Soccer (EPL, La Liga, UCL, Europa)
- UFC
- Tennis
- Formula 1

All with the same enhanced betting interface!

