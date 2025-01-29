/**
 * public/scripts.js
 * Front-end logic for sign in, sign up, item creation, searching, etc.
 * Also sets up Socket.io
 */

let map;
let marker;
let circle;
let currentLatLng = { lat: 40.4406, lng: -79.9959 }; // Pittsburgh default
let isLoggedIn = false;
let authToken = "";
let userRole = "user";

let socket;
(function initSocket() {
  socket = io();
  socket.on("connect", () => {
    console.log("Connected to socket.io with ID:", socket.id);
  });

  // Listen for item notifications
  socket.on("itemNotification", (item) => {
    alert(`New item posted in category [${item.category}]: ${item.title}`);
  });

  // Listen for chat messages in the room
  socket.on("receiveRoomMessage", (msg) => {
    console.log("Message in room:", msg);
    // Update your chat UI if you have one
  });
})();

// Join a chat room
function joinRoom(roomId) {
  socket.emit("joinRoom", roomId);
}

// Send a message to a room
function sendRoomMessage(roomId, content) {
  socket.emit("sendRoomMessage", {
    roomId,
    content,
    sender: "You"
  });
}

// Subscribe to category
function subscribeCategory(category) {
  socket.emit("subscribeCategory", category);
}

// ================= MAP =================
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
  if(locationInput) {
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
  }

  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  if(zoomInBtn) {
    zoomInBtn.addEventListener("click", () => {
      map.setZoom(map.getZoom() + 1);
    });
  }
  if(zoomOutBtn) {
    zoomOutBtn.addEventListener("click", () => {
      map.setZoom(map.getZoom() - 1);
    });
  }
}

function updateCircle(center) {
  const radiusVal = document.getElementById("radiusInput").value;
  if(!radiusVal) return;
  const radiusMeters = parseFloat(radiusVal)*1609.34;
  if(circle) circle.setMap(null);
  circle = new google.maps.Circle({
    map,
    center,
    radius: radiusMeters,
    fillColor: "#4285F4",
    fillOpacity: 0.2,
    strokeColor: "#4285F4",
    strokeWeight: 1,
  });
  map.fitBounds(circle.getBounds());
}

// ================= MODALS =================
const loginModal = document.getElementById("loginModal");
const signupModal = document.getElementById("signupModal");

const openLoginBtn = document.getElementById("openLoginModal");
const closeLoginBtn = document.getElementById("closeLoginModal");
const openSignupBtn = document.getElementById("openSignupModal");
const closeSignupBtn = document.getElementById("closeSignupModal");

const toSignupLink = document.getElementById("toSignupLink");
const toLoginLink = document.getElementById("toLoginLink");

if(openLoginBtn) {
  openLoginBtn.addEventListener("click", () => {
    loginModal.style.display = "flex";
  });
}
if(closeLoginBtn) {
  closeLoginBtn.addEventListener("click", () => {
    loginModal.style.display = "none";
  });
}
if(openSignupBtn) {
  openSignupBtn.addEventListener("click", () => {
    signupModal.style.display = "flex";
  });
}
if(closeSignupBtn) {
  closeSignupBtn.addEventListener("click", () => {
    signupModal.style.display = "none";
  });
}
if(toSignupLink) {
  toSignupLink.addEventListener("click", () => {
    loginModal.style.display = "none";
    signupModal.style.display = "flex";
  });
}
if(toLoginLink) {
  toLoginLink.addEventListener("click", () => {
    signupModal.style.display = "none";
    loginModal.style.display = "flex";
  });
}

window.addEventListener("click", (e) => {
  if(e.target === loginModal) loginModal.style.display = "none";
  if(e.target === signupModal) signupModal.style.display = "none";
});

// ========== AUTH FORMS ==========
const loginForm = document.getElementById("loginForm");
if(loginForm) {
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
      if(res.ok) {
        alert("Login successful!");
        isLoggedIn = true;
        authToken = data.token;
        userRole = data.user.role;
        loginModal.style.display = "none";
      } else {
        alert(data.message || "Login failed");
      }
    } catch(err) {
      alert("Error logging in");
    }
  });
}

const signupForm = document.getElementById("signupForm");
if(signupForm) {
  signupForm.addEventListener("submit", async(e) => {
    e.preventDefault();
    const fullName = document.getElementById("signupName").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const confirmPass = document.getElementById("confirmPassword").value;
    if(password !== confirmPass) {
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
      if(res.ok) {
        alert("Signup successful!");
        isLoggedIn = true;
        authToken = data.token;
        signupModal.style.display = "none";
      } else {
        alert(data.message || "Signup failed");
      }
    } catch(err) {
      alert("Error signing up");
    }
  });
}

const signupPassword = document.getElementById("signupPassword");
const confirmPassword = document.getElementById("confirmPassword");
function validatePasswords() {
  if(signupPassword && confirmPassword) {
    if(signupPassword.value !== confirmPassword.value) {
      confirmPassword.setCustomValidity("Passwords do not match");
    } else {
      confirmPassword.setCustomValidity("");
    }
  }
}
if(signupPassword) signupPassword.onchange = validatePasswords;
if(confirmPassword) confirmPassword.onkeyup = validatePasswords;

// ========== BUY / SELL TOGGLE ==========
const buyOption = document.getElementById("buyOption");
const sellOption = document.getElementById("sellOption");
const createItemForm = document.getElementById("createItemForm");

if(buyOption && sellOption) {
  buyOption.addEventListener("click", () => {
    buyOption.classList.add("active");
    sellOption.classList.remove("active");
    if(createItemForm) createItemForm.style.display = "none";
  });
  sellOption.addEventListener("click", () => {
    sellOption.classList.add("active");
    buyOption.classList.remove("active");
    if(!isLoggedIn) {
      alert("You must be logged in to sell items.");
      if(loginModal) loginModal.style.display = "flex";
    } else {
      if(createItemForm) createItemForm.style.display = "block";
    }
  });
}

// ========== CREATE ITEM ==========
const createItemActualForm = document.getElementById("createItemActualForm");
if(createItemActualForm) {
  createItemActualForm.addEventListener("submit", async(e) => {
    e.preventDefault();
    if(!isLoggedIn) {
      alert("Please log in first.");
      return;
    }
    const formData = new FormData(createItemActualForm);
    formData.append("coordinates", JSON.stringify([currentLatLng.lng, currentLatLng.lat]));

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: formData
      });
      const data = await res.json();
      if(res.ok) {
        alert("Item created successfully!");
        // Notify socket subscribers
        socket.emit("newItemCreated", data.item);
        createItemActualForm.reset();
      } else {
        alert(data.message || "Error creating item");
      }
    } catch(err) {
      alert("Error creating item");
    }
  });
}

// ========== SEARCH ==========
const searchButton = document.getElementById("searchButton");
if(searchButton) {
  searchButton.addEventListener("click", async() => {
    const locationVal = document.getElementById("locationInput").value;
    const radiusVal = document.getElementById("radiusInput").value;
    if(!locationVal || !radiusVal) {
      alert("Please enter location and radius");
      return;
    }
    try {
      const res = await fetch(
        `/api/items/search/location?lng=${currentLatLng.lng}&lat=${currentLatLng.lat}&radius=${radiusVal}`
      );
      const items = await res.json();
      if(Array.isArray(items)) {
        console.log("Found items:", items);
        alert(`Found ${items.length} items. Check console for details.`);
      } else {
        alert(items.message || "Error searching");
      }
    } catch(err) {
      alert("Error searching");
    }
  });
}
