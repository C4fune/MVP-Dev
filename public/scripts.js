/**
 * public/scripts.js
 */

let map;
let marker;
let circle;
let currentLatLng = { lat: 40.4406, lng: -79.9959 }; // Pittsburgh default
let isLoggedIn = false;
let authToken = "";
let userRole = "user";

// For Stripe example
const STRIPE_PUBLIC_KEY = "YOUR_STRIPE_PUBLISHABLE_KEY"; // or fetch from backend
let stripe;
if (STRIPE_PUBLIC_KEY !== "YOUR_STRIPE_PUBLISHABLE_KEY") {
  stripe = Stripe(STRIPE_PUBLIC_KEY);
}

// ================= GOOGLE MAPS ===================== //
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: currentLatLng,
    zoom: 13,
    styles: [
      {
        elementType: "geometry",
        stylers: [{ color: "#242f3e" }],
      },
      {
        elementType: "labels.text.fill",
        stylers: [{ color: "#746855" }],
      },
      {
        elementType: "labels.text.stroke",
        stylers: [{ color: "#242f3e" }],
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#17263c" }],
      },
    ],
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  });

  const locationInput = document.getElementById("locationInput");
  const autocomplete = new google.maps.places.Autocomplete(locationInput);
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place.geometry) return;
    map.setCenter(place.geometry.location);
    currentLatLng = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };
    if (marker) {
      marker.setPosition(place.geometry.location);
    } else {
      marker = new google.maps.Marker({
        map,
        position: place.geometry.location,
      });
    }
    updateCircle(place.geometry.location);
  });

  document.getElementById("zoomInBtn").addEventListener("click", () => {
    map.setZoom(map.getZoom() + 1);
  });
  document.getElementById("zoomOutBtn").addEventListener("click", () => {
    map.setZoom(map.getZoom() - 1);
  });
}

function updateCircle(center) {
  const radius = document.getElementById("radiusInput").value;
  if (!radius) return;
  const radiusInMeters = parseFloat(radius) * 1609.34;
  if (circle) circle.setMap(null);
  circle = new google.maps.Circle({
    map,
    center,
    radius: radiusInMeters,
    fillColor: "#4285F4",
    fillOpacity: 0.2,
    strokeColor: "#4285F4",
    strokeWeight: 1,
  });
  map.fitBounds(circle.getBounds());
}

// ================= SOCKET.IO ===================== //
let socket;
(function initSocket() {
  socket = io(); // connects to same origin
  socket.on("connect", () => {
    console.log("Connected to socket.io with ID:", socket.id);
  });

  // Listen for item notifications
  socket.on("itemNotification", (item) => {
    alert(`New item posted in category [${item.category}]: ${item.title}`);
  });

  // Chat messages
  socket.on("receiveRoomMessage", (msg) => {
    console.log("Received message in room:", msg);
    // You could update chat UI here
  });
})();

// Join a room for dedicated chat
function joinRoom(roomId) {
  socket.emit("joinRoom", roomId);
}

// Send a message to a specific room
function sendRoomMessage(roomId, content) {
  // pass the sender as well
  const data = { roomId, content, sender: "You" };
  socket.emit("sendRoomMessage", data);
}

// Subscribe to a category
function subscribeCategory(cat) {
  socket.emit("subscribeCategory", cat);
}

// ================= MODALS ========================= //
const loginModal = document.getElementById("loginModal");
const signupModal = document.getElementById("signupModal");

const openLoginBtn = document.getElementById("openLoginModal");
const closeLoginBtn = document.getElementById("closeLoginModal");
const openSignupBtn = document.getElementById("openSignupModal");
const closeSignupBtn = document.getElementById("closeSignupModal");

const toSignupLink = document.getElementById("toSignupLink");
const toLoginLink = document.getElementById("toLoginLink");

// Some pages might not have these buttons, so check null
if (openLoginBtn) {
  openLoginBtn.addEventListener("click", () => {
    loginModal.style.display = "flex";
  });
}
if (closeLoginBtn) {
  closeLoginBtn.addEventListener("click", () => {
    loginModal.style.display = "none";
  });
}
if (openSignupBtn) {
  openSignupBtn.addEventListener("click", () => {
    signupModal.style.display = "flex";
  });
}
if (closeSignupBtn) {
  closeSignupBtn.addEventListener("click", () => {
    signupModal.style.display = "none";
  });
}
if (toSignupLink) {
  toSignupLink.addEventListener("click", () => {
    loginModal.style.display = "none";
    signupModal.style.display = "flex";
  });
}
if (toLoginLink) {
  toLoginLink.addEventListener("click", () => {
    signupModal.style.display = "none";
    loginModal.style.display = "flex";
  });
}

window.addEventListener("click", (e) => {
  if (e.target === loginModal) loginModal.style.display = "none";
  if (e.target === signupModal) signupModal.style.display = "none";
});

// ========== AUTH FORMS ========== //
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Login successful!");
        isLoggedIn = true;
        authToken = data.token;
        userRole = data.user.role;
        loginModal.style.display = "none";
      } else {
        alert(data.message || "Login failed");
      }
    } catch (error) {
      alert("Error logging in");
    }
  });
}

const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fullName = document.getElementById("signupName").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    try {
      const res = await fetch("/api/users/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Signup successful!");
        isLoggedIn = true;
        authToken = data.token;
        signupModal.style.display = "none";
      } else {
        alert(data.message || "Signup failed");
      }
    } catch (error) {
      alert("Error signing up");
    }
  });
}

// Validate password
const signupPassword = document.getElementById("signupPassword");
const confirmPassword = document.getElementById("confirmPassword");
function validatePassword() {
  if (signupPassword && confirmPassword) {
    if (signupPassword.value !== confirmPassword.value) {
      confirmPassword.setCustomValidity("Passwords do not match");
    } else {
      confirmPassword.setCustomValidity("");
    }
  }
}
if (signupPassword) signupPassword.onchange = validatePassword;
if (confirmPassword) confirmPassword.onkeyup = validatePassword;

// ========== BUY / SELL TOGGLE ========== //
const buyOption = document.getElementById("buyOption");
const sellOption = document.getElementById("sellOption");
const createItemForm = document.getElementById("createItemForm");

if (buyOption && sellOption) {
  buyOption.addEventListener("click", () => {
    buyOption.classList.add("active");
    sellOption.classList.remove("active");
    createItemForm.style.display = "none";
  });
  sellOption.addEventListener("click", () => {
    sellOption.classList.add("active");
    buyOption.classList.remove("active");
    if (!isLoggedIn) {
      alert("You must be logged in to sell items.");
      loginModal.style.display = "flex";
    } else {
      createItemForm.style.display = "block";
    }
  });
}

// ========== CREATE ITEM ========== //
const createItemActualForm = document.getElementById("createItemActualForm");
if (createItemActualForm) {
  createItemActualForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      alert("Please log in first.");
      return;
    }

    const formData = new FormData(createItemActualForm);
    // We also pass coordinates
    formData.append("coordinates", JSON.stringify([currentLatLng.lng, currentLatLng.lat]));

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        alert("Item created successfully!");
        // Optionally notify socket
        socket.emit("newItemCreated", data.item);
        createItemActualForm.reset();
      } else {
        alert(data.message || "Error creating item");
      }
    } catch (error) {
      alert("Error creating item");
    }
  });
}

// ========== SEARCH ========== //
const searchButton = document.getElementById("searchButton");
if (searchButton) {
  searchButton.addEventListener("click", async () => {
    const locationVal = document.getElementById("locationInput").value;
    const radiusVal = document.getElementById("radiusInput").value;
    if (!locationVal || !radiusVal) {
      alert("Please enter location and radius");
      return;
    }
    try {
      const res = await fetch(
        `/api/items/search/location?lng=${currentLatLng.lng}&lat=${currentLatLng.lat}&radius=${radiusVal}`
      );
      const items = await res.json();
      if (Array.isArray(items)) {
        console.log("Found items:", items);
        alert(`Found ${items.length} items. Check console for details.`);
      } else {
        alert(items.message || "Error searching");
      }
    } catch (error) {
      alert("Error searching");
    }
  });
}

// ========== PAYMENT EXAMPLE ========== //
async function buyItem(itemId) {
  if (!isLoggedIn) {
    alert("Please log in first!");
    return;
  }
  // Create Stripe PaymentIntent
  try {
    const res = await fetch("/api/payments/create-intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ itemId }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Error creating payment intent");
      return;
    }
    const clientSecret = data.clientSecret;
    // Use Stripe.js to confirm card payment
    const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: { /* card details from a card element */ },
      },
    });
    if (error) {
      alert("Payment failed: " + error.message);
      return;
    }
    if (paymentIntent && paymentIntent.status === "succeeded") {
      // Confirm on backend
      const confirmRes = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) {
        alert(confirmData.message || "Error confirming payment");
      } else {
        alert("Payment succeeded! Transaction recorded.");
      }
    }
  } catch (error) {
    console.error(error);
    alert("Payment error");
  }
}

// (Implementation note: you'd have a CardElement on your page for the user to enter card details.)

// ========== LEADERBOARD & PROFILE EXAMPLES ========== //
async function fetchLeaderboard() {
  try {
    const res = await fetch("/api/extra/leaderboard");
    const data = await res.json();
    console.log("Leaderboard:", data);
    // Render on page if you want
  } catch (error) {
    console.error(error);
  }
}

// Get public profile
async function getProfile(userId) {
  try {
    const res = await fetch(`/api/extra/profile/${userId}`);
    const data = await res.json();
    console.log(`User ${userId} profile:`, data);
    // data.user => basic info, data.items => their listed items
  } catch (error) {
    console.error(error);
  }
}

// Transaction history for me
async function myTransactionHistory() {
  if (!isLoggedIn) {
    alert("Must be logged in");
    return;
  }
  try {
    const res = await fetch("/api/extra/my-transactions", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    const data = await res.json();
    console.log("My transactions:", data);
  } catch (error) {
    console.error(error);
  }
}
