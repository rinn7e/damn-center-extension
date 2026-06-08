# Introduction to Chrome Extension Local Storage (`chrome.storage.local`)

Hello! Welcome to the beginner's guide to **Chrome Extension Storage**. If you are building a Google Chrome extension and need a place to save user settings, login tokens, or configuration options, you are in the right place!

Think of `chrome.storage.local` as the extension's personal, private notepad that lives inside the user's browser profile. Let's learn how it works step-by-step!

---

## 1. What is `chrome.storage.local`?

When you browse the web, websites use something called `localStorage` to remember things (like whether you turned on dark mode).

However, browser extensions are different from regular websites. Extensions run in the background, inject scripts into other web pages, and have popups. Because they are more complex, they need a special kind of storage that:

1. **Can be accessed from anywhere** (popup, background files, and scripts on webpages).
2. **Doesn't freeze the browser** when loading or saving data (fully asynchronous).
3. **Can store complex data** (like objects and lists) directly.

That is why Google Chrome provides **`chrome.storage.local`**. It is a fast, local key-value database stored on the user's hard drive.

---

## 2. Setting Up: Asking for Permission

Before your extension can write anything down, you must tell Chrome that you want to use the storage room. You do this in your extension's config file, `manifest.json`.

Open your `manifest.json` file and add `"storage"` to the `permissions` list:

```json
{
  "name": "My Cool Extension",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": ["storage"]
}
```

If you don't add this, trying to use the storage code will throw an error!

---

## 3. The Key-Value System

Think of `chrome.storage.local` like a cupboard full of labeled boxes:

- **The Key**: The label written on the outside of the box (e.g., `"username"` or `"theme"`).
- **The Value**: The item you put inside the box (e.g., `"Master"` or `{"darkMode": true}`).

Whenever you want to save or load something, you just tell Chrome the label (key) you want to use.

---

## 4. How to Save Data (`.set()`)

To save data, we use the `chrome.storage.local.set()` function. You pass it a JavaScript object containing the keys and values you want to save.

### The Basic Code:

```javascript
// Saving a simple string and a boolean
chrome.storage.local.set(
  {
    username: 'Master',
    darkMode: true,
  },
  () => {
    console.log('Data has been saved successfully!')
  },
)
```

### Saving Complex Objects:

Unlike web `localStorage` (which only lets you save text), `chrome.storage.local` can save lists and objects directly!

```javascript
const userSettings = {
  paddingWidth: 80,
  selectedColor: '#10b981',
  allowedSites: ['github.com', 'reddit.com'],
}

// Save the whole object under the key "user_config"
chrome.storage.local.set({ user_config: userSettings }, () => {
  console.log('Settings saved!')
})
```

---

## 5. How to Load Data (`.get()`)

To read data back out of storage, we use `chrome.storage.local.get()`. You pass it the key name (or a list of key names) you want to retrieve.

### Loading a Specific Key:

```javascript
chrome.storage.local.get(['username'], (result) => {
  // result is an object containing the keys you asked for
  console.log('Loaded username:', result.username) // Prints: "Master"
})
```

### Loading Multiple Keys:

```javascript
chrome.storage.local.get(['username', 'darkMode'], (result) => {
  console.log('Username:', result.username)
  console.log('Dark Mode Enabled:', result.darkMode)
})
```

### Providing a Default Fallback Value:

If the user has never saved anything before, you can define a default value right inside the `.get()` request:

```javascript
// If "theme" doesn't exist in storage yet, it defaults to "solarized"
chrome.storage.local.get({ theme: 'solarized' }, (result) => {
  console.log('Active theme:', result.theme)
})
```

---

## 6. How to Delete Data (`.remove()` and `.clear()`)

If you want to delete a specific box, or clear the whole cupboard:

### Delete one item:

```javascript
// Remove the "username" box
chrome.storage.local.remove(['username'], () => {
  console.log('Username has been deleted!')
})
```

### Wipe everything:

```javascript
// Clear all data saved by this extension
chrome.storage.local.clear(() => {
  console.log('All extension storage has been wiped clean!')
})
```

---

## 7. Sync vs Local: What's the difference?

You might sometimes see code using `chrome.storage.sync` instead of `chrome.storage.local`. Here is the difference:

- **`chrome.storage.local` (What we use)**: Saves data only on the user's current computer. It has a larger capacity (10MB, expandable to unlimited) and is perfect for device-specific options (like window sizes, padding, or machine configurations).
- **`chrome.storage.sync`**: Saves data to the cloud. If the user is logged into Google Chrome on another computer or phone, Chrome will sync the settings automatically! However, it has a very tiny capacity limit (around 100KB total) and limits how often you can write to it.

---

## 8. Pro-Tip: Making it modern with Promises

By default, Chrome APIs use **callbacks** (passing a function as a parameter). If you prefer modern JavaScript `async/await` syntax, Chrome returns promises if you omit the callback parameter!

Here is how you can write cleaner code:

### Modern Saving:

```javascript
async function saveTheme(themeName) {
  try {
    await chrome.storage.local.set({ theme: themeName })
    console.log('Theme saved!')
  } catch (error) {
    console.error('Failed to save:', error)
  }
}
```

### Modern Loading:

```javascript
async function getTheme() {
  const result = await chrome.storage.local.get({ theme: 'light' })
  return result.theme
}
```

---

Congratulations! You now know the basics of how to store and retrieve data inside a Chrome extension! You are ready to start building!
