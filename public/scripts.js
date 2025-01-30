/**
 * scripts.js
 * Full code including profile.html addition + dynamic header for "My Profile".
 */

// ===== Global State =====
let map;
let marker;
let circle;
let currentLatLng = { lat: 40.4406, lng: -79.9959 }; // Example default location (Pittsburgh)
let isLoggedIn = false;
let authToken = "";
let userRole = "user";

let socket;
(function initSocket() {
  // Connect to socket.io
  socket = io();

  socket.on("connect", () => {
    console.log("Socket.io connected:", socket.id);
  });

  // Listen for item notifications
  socket.on("itemNotification", (item) => {
    alert(`New item posted in category [${item.category}]: ${item.title}`);
  });

  // Listen for real-time chat messages in a room
  socket.on("receiveRoomMessage", (msg) => {
    console.log("Room message:", msg);
    // Update your chat UI if you wish
  });
})();

// ===== On Page Load =====
document.addEventListener("DOMContentLoaded", () => {
  // Check localStorage for token to see if user is logged in
  const token = localStorage.getItem("unithriftToken");
  if (token) {
    isLoggedIn = true;
    authToken = token;
    const userStr = localStorage.getItem("unithriftUser");
    if (userStr) {
      const userObj = JSON.parse(userStr);
      userRole = userObj.role || "user";
    }
  }

  // Toggle header links based on login status
  updateHeaderLinks();

  // If we're on the profile page, ensure user is logged in
  if (document.title.includes("My Profile")) {
    if (!isLoggedIn) {
      alert("You must be logged in to view your profile.");
      window.location.href = "index.html";
    } else {
      // Populate the profile page with user info
      populateProfilePage();
    }
  }
});

// ===== Header Toggling (My Profile vs. Log In) =====
function updateHeaderLinks() {
  const headerRight = document.getElementById("headerRight");
  const navLinks = document.getElementById("navLinks");
  if (!headerRight) return;

  // Clear existing header-right elements
  headerRight.innerHTML = "";

  if (isLoggedIn) {
    // Show "My Profile" link (in the nav) and "Log out" button
    if (navLinks) {
      // If there's no "My Profile" link, create it
      let myProfileLink = document.getElementById("myProfileLink");
      if (!myProfileLink) {
        myProfileLink = document.createElement("a");
        myProfileLink.id = "myProfileLink";
        myProfileLink.href = "profile.html";
        myProfileLink.classList.add("nav-link");
        myProfileLink.textContent = "My Profile";
        navLinks.appendChild(myProfileLink);
      }
    }

    // Create Log out button
    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "Log out";
    logoutBtn.className = "auth-button login-btn";
    logoutBtn.onclick = () => { logOut(); };
    headerRight.appendChild(logoutBtn);

  } else {
    // Show "Log in" + "Sign up" 
    const loginBtn = document.createElement("button");
    loginBtn.className = "auth-button login-btn";
    loginBtn.id = "openLoginModal";
    loginBtn.textContent = "Log in";
    loginBtn.onclick = () => {
      const loginModal = document.getElementById("loginModal");
      if (loginModal) loginModal.style.display = "flex";
    };
    headerRight.appendChild(loginBtn);

    const signupBtn = document.createElement("button");
    signupBtn.className = "auth-button signup-btn";
    signupBtn.id = "openSignupModal";
    signupBtn.textContent = "Sign up";
    signupBtn.onclick = () => {
      const signupModal = document.getElementById("signupModal");
      if (signupModal) signupModal.style.display = "flex";
    };
    headerRight.appendChild(signupBtn);

    // Also remove "My Profile" link if it existed
    const myProfileLink = document.getElementById("myProfileLink");
    if (myProfileLink && navLinks) {
      navLinks.removeChild(myProfileLink);
    }
  }
}

/** Log out: clear localStorage and refresh */
function logOut() {
  localStorage.removeItem("unithriftToken");
  localStorage.removeItem("unithriftUser");
  isLoggedIn = false;
  authToken = "";
  userRole = "user";
  // Return to home
  window.location.href = "index.html";
}

/** On profile.html, fill the page with user info + their listings */
async function populateProfilePage() {
  const userStr = localStorage.getItem("unithriftUser");
  if (userStr) {
    const user = JSON.parse(userStr);
    const profileNameEl = document.getElementById("profileName");
    const profileEmailEl = document.getElementById("profileEmail");
    if (profileNameEl) profileNameEl.textContent = user.fullName;
    if (profileEmailEl) profileEmailEl.textContent = user.email;

    // Optionally fetch the user’s items from the server
    try {
      const res = await fetch(`/api/extra/profile/${user.id}`);
      const data = await res.json();
      if (data.items) {
        const container = document.getElementById("myListingsContainer");
        container.innerHTML = "";
        data.items.forEach((item) => {
          const card = document.createElement("div");
          card.style.padding = "10px";
          card.style.border = "1px solid #aaa";
          card.style.marginBottom = "10px";
          card.innerHTML = `
            <h5 style="color:#fff;">${item.title}</h5>
            <p style="color:#ccc;">Price: $${item.price}</p>
          `;
          container.appendChild(card);
        });
      }
    } catch (err) {
      console.error("Failed to fetch profile items:", err);
    }
  }
}

// ====== Google Maps Init ======
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: currentLatLng,
    zoom: 13,
    styles: [
      {
        elementType: "geometry",
        stylers: [{ color: "#242f3e" }]
      },
      {
        elementType: "labels.text.fill",
        stylers: [{ color: "#746855" }]
      },
      {
        elementType: "labels.text.stroke",
        stylers: [{ color: "#242f3e" }]
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#17263c" }]
      }
    ],
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false
  });

  const locationInput = document.getElementById("locationInput");
  if (locationInput) {
    const autocomplete = new google.maps.places.Autocomplete(locationInput);
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;

      map.setCenter(place.geometry.location);
      currentLatLng = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      };

      if (marker) {
        marker.setPosition(place.geometry.location);
      } else {
        marker = new google.maps.Marker({
          map,
          position: place.geometry.location
        });
      }

      updateCircle(place.geometry.location);
    });
  }

  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", () => {
      map.setZoom(map.getZoom() + 1);
    });
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", () => {
      map.setZoom(map.getZoom() - 1);
    });
  }
}

function updateCircle(center) {
  const radiusInput = document.getElementById("radiusInput");
  if (!radiusInput) return;

  const radiusVal = radiusInput.value;
  if (!radiusVal) return;

  const radiusMeters = parseFloat(radiusVal) * 1609.34;
  if (circle) circle.setMap(null);

  circle = new google.maps.Circle({
    map,
    center,
    radius: radiusMeters,
    fillColor: "#4285F4",
    fillOpacity: 0.2,
    strokeColor: "#4285F4",
    strokeWeight: 1
  });

  map.fitBounds(circle.getBounds());
}

// ====== Modal Handling (Login/Signup) ======
const loginModal = document.getElementById("loginModal");
const signupModal = document.getElementById("signupModal");

const openLoginBtn = document.getElementById("openLoginModal");
const closeLoginBtn = document.getElementById("closeLoginModal");
const openSignupBtn = document.getElementById("openSignupModal");
const closeSignupBtn = document.getElementById("closeSignupModal");

const toSignupLink = document.getElementById("toSignupLink");
const toLoginLink = document.getElementById("toLoginLink");

if (openLoginBtn) {
  openLoginBtn.addEventListener("click", () => {
    if (loginModal) loginModal.style.display = "flex";
  });
}
if (closeLoginBtn) {
  closeLoginBtn.addEventListener("click", () => {
    if (loginModal) loginModal.style.display = "none";
  });
}
if (openSignupBtn) {
  openSignupBtn.addEventListener("click", () => {
    if (signupModal) signupModal.style.display = "flex";
  });
}
if (closeSignupBtn) {
  closeSignupBtn.addEventListener("click", () => {
    if (signupModal) signupModal.style.display = "none";
  });
}

if (toSignupLink) {
  toSignupLink.addEventListener("click", () => {
    if (loginModal) loginModal.style.display = "none";
    if (signupModal) signupModal.style.display = "flex";
  });
}
if (toLoginLink) {
  toLoginLink.addEventListener("click", () => {
    if (signupModal) signupModal.style.display = "none";
    if (loginModal) loginModal.style.display = "flex";
  });
}

window.addEventListener("click", (e) => {
  if (e.target === loginModal) loginModal.style.display = "none";
  if (e.target === signupModal) signupModal.style.display = "none";
});

// ====== Login Form ======
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
        // Save token
        localStorage.setItem("unithriftToken", data.token);
        localStorage.setItem("unithriftUser", JSON.stringify(data.user));

        isLoggedIn = true;
        authToken = data.token;
        userRole = data.user.role;

        alert("Login successful!");
        if (loginModal) loginModal.style.display = "none";

        // Refresh or go home
        window.location.href = "index.html";
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error logging in");
    }
  });
}

// ====== Signup Form ======
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
        // Save token
        localStorage.setItem("unithriftToken", data.token);
        localStorage.setItem("unithriftUser", JSON.stringify(data.user));

        isLoggedIn = true;
        authToken = data.token;
        userRole = data.user.role;

        alert("Signup successful!");
        if (signupModal) signupModal.style.display = "none";

        // Redirect to home
        window.location.href = "index.html";
      } else {
        alert(data.message || "Signup failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error signing up");
    }
  });
}

// Password validation
const signupPassword = document.getElementById("signupPassword");
const confirmPassword = document.getElementById("confirmPassword");
function validatePasswords() {
  if (signupPassword && confirmPassword) {
    if (signupPassword.value !== confirmPassword.value) {
      confirmPassword.setCustomValidity("Passwords do not match");
    } else {
      confirmPassword.setCustomValidity("");
    }
  }
}
if (signupPassword) signupPassword.onchange = validatePasswords;
if (confirmPassword) confirmPassword.onkeyup = validatePasswords;

// ====== Buy / Sell Toggle ======
const buyOption = document.getElementById("buyOption");
const sellOption = document.getElementById("sellOption");
const createItemForm = document.getElementById("createItemForm");

if (buyOption && sellOption) {
  buyOption.addEventListener("click", () => {
    buyOption.classList.add("active");
    sellOption.classList.remove("active");
    if (createItemForm) createItemForm.style.display = "none";
  });
  sellOption.addEventListener("click", () => {
    sellOption.classList.add("active");
    buyOption.classList.remove("active");
    if (!localStorage.getItem("unithriftToken")) {
      alert("You must be logged in to sell items.");
      if (loginModal) loginModal.style.display = "flex";
    } else {
      if (createItemForm) createItemForm.style.display = "block";
    }
  });
}

// ====== Create Item ======
const createItemActualForm = document.getElementById("createItemActualForm");
if (createItemActualForm) {
  createItemActualForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("unithriftToken");
    if (!token) {
      alert("Please log in first.");
      return;
    }

    const formData = new FormData(createItemActualForm);
    // Add location coordinates
    formData.append("coordinates", JSON.stringify([currentLatLng.lng, currentLatLng.lat]));

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        alert("Item created successfully!");
        // Notify socket subscribers 
        socket.emit("newItemCreated", data.item);
        createItemActualForm.reset();
      } else {
        alert(data.message || "Error creating item");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating item");
    }
  });
}

// ====== Searching for Items (Radius) ======
const searchButton = document.getElementById("searchButton");
if (searchButton) {
  searchButton.addEventListener("click", async () => {
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
        alert(`Found ${items.length} item(s). Check console for details.`);
      } else {
        alert(items.message || "Error searching items");
      }
    } catch(err) {
      console.error(err);
      alert("Error searching items");
    }
  });
}
