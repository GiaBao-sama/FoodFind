let restaurants = [];
let filteredRestaurants = [];
let selectedCategory = null;
let selectedFeatures = [];
let showAllItems = false;
const ITEMS_PER_PAGE = 6;

const firebaseConfig = {
    apiKey: "AIzaSyA0W0KuRDcniVnu6QcgFhbZag0ZZ1eZgaU",
    authDomain: "timquan-79eef.firebaseapp.com",
    projectId: "timquan-79eef",
    storageBucket: "timquan-79eef.firebasestorage.app",
    messagingSenderId: "64273779937",
    appId: "1:64273779937:web:7f840e40cacc7d1d537ba0",
    measurementId: "G-NF4PL2WQK6"
};

// When using Live Server locally, make sure Firebase Authorized Domains includes:
// localhost
// 127.0.0.1
// 127.0.0.1 (any port is allowed once the hostname is authorized)

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const categoryMap = {
    food: "Ăn uống",
    cafe: "Cafe",
    study: "Học tập",
    work: "Làm việc"
};

function normalizeValue(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .trim();
}

function matchesCategory(place, category) {
    const normalizedCategory = normalizeValue(category);
    const normalizedPlaceCategory = normalizeValue(place.category);
    const features = place.features || {};
    const tags = normalizeValue(Array.isArray(place.tags) ? place.tags.join(" ") : place.tags || "");

    if (normalizedCategory === "an uong") {
        return normalizedPlaceCategory === "an uong" || tags.includes("an uong") || (normalizedPlaceCategory === "cafe" && (tags.includes("dessert") || tags.includes("food")));
    }

    if (normalizedCategory === "cafe") {
        return normalizedPlaceCategory === "cafe" || tags.includes("cafe") || normalizedPlaceCategory === "coffee";
    }

    if (normalizedCategory === "hoc tap") {
        const studyMatch = normalizedPlaceCategory === "hoc tap" || normalizedPlaceCategory === "study";
        const featureMatch = features.study === true || tags.includes("study") || normalizeValue(place.name).includes("study");
        return studyMatch || featureMatch;
    }

    if (normalizedCategory === "lam viec") {
        const workMatch = normalizedPlaceCategory === "lam viec" || normalizedPlaceCategory === "work";
        const featureMatch = features.work === true || tags.includes("work") || normalizeValue(place.name).includes("work") || (features.study === true && tags.includes("space"));
        return workMatch || featureMatch;
    }

    return normalizedPlaceCategory === normalizedCategory;
}

function getCategoryValue(button) {
    const type = button.dataset.type || button.dataset.category || "";
    return categoryMap[type] || type;
}

function formatPrice(price) {
    if (price == null || price === "") return "Liên hệ";
    return `${Number(price).toLocaleString()}đ`;
}

function formatTime(openTime, closeTime) {
    if (!openTime || !closeTime || openTime === "" || closeTime === "") return "Đang cập nhật";
    return `${openTime} - ${closeTime}`;
}

function applyFilters() {
    let results = [...restaurants];

    if (selectedCategory) {
        results = results.filter(place => matchesCategory(place, selectedCategory));
    }

    if (selectedFeatures.length > 0) {
        results = results.filter(place => selectedFeatures.every(feature => place.features?.[feature]));
    }

    filteredRestaurants = results;
    showAllItems = false;
    renderRestaurants(filteredRestaurants);
}

async function loadData() {
    try {
        const response = await fetch("data/res.json");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        restaurants = Array.isArray(data) ? data.filter(place => place && place.name) : [];
        filteredRestaurants = [...restaurants];
        attachFeatureFilters();
        renderRestaurants(filteredRestaurants);
    } catch (err) {
        console.error(err);
        const container = document.getElementById("restaurant-list");
        if (container) {
            container.innerHTML = '<div class="col-12 text-center text-muted">Không thể tải dữ liệu.</div>';
        }
    }
}

function getActivities() {
    try {
        return JSON.parse(localStorage.getItem("foodfinderActivities")) || [];
    } catch (error) {
        return [];
    }
}

function saveActivity(type, title, detail) {
    const activities = getActivities();
    activities.unshift({
        type,
        title,
        detail,
        timestamp: new Date().toISOString()
    });

    localStorage.setItem("foodfinderActivities", JSON.stringify(activities.slice(0, 12)));
    localStorage.setItem("foodfinderHasInteracted", "true");
}

function renderRestaurants(data) {
    const container = document.getElementById("restaurant-list");
    if (!container) return;

    const oldShowMore = document.getElementById("show-more-container");
    if (oldShowMore) oldShowMore.remove();
    container.innerHTML = "";

    if (!data.length) {
        container.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <h4 class="fw-bold">Không có quán phù hợp</h4>
                    <p class="text-muted mb-0">Hãy thử đổi bộ lọc hoặc chọn mục khác để xem thêm kết quả.</p>
                </div>
            </div>
        `;
        return;
    }

    const itemsToShow = showAllItems ? data : data.slice(0, ITEMS_PER_PAGE);

    itemsToShow.forEach(place => {
        container.insertAdjacentHTML("beforeend", createCard(place));
    });

    if (data.length > ITEMS_PER_PAGE && !showAllItems) {
        const showMoreDiv = document.createElement("div");
        showMoreDiv.id = "show-more-container";
        showMoreDiv.className = "col-12 text-center mt-4";
        showMoreDiv.innerHTML = `
            <button class="btn btn-outline-success btn-lg" id="show-more-btn">
                Xem thêm (${data.length - ITEMS_PER_PAGE} còn lại)
            </button>
        `;
        container.parentElement.insertBefore(showMoreDiv, container.nextSibling);

        document.getElementById("show-more-btn").addEventListener("click", () => {
            showAllItems = true;
            renderRestaurants(data);
        });
    }
}

function createCard(place) {
    const ratingText = place.rating != null ? `⭐ ${place.rating}` : "⭐ Chưa có đánh giá";
    const districtText = place.district || "Đang cập nhật";
    const timeText = formatTime(place.openTime?.open, place.openTime?.close);
    const priceText = place.price && (place.price.min != null || place.price.max != null)
        ? `${formatPrice(place.price.min)} - ${formatPrice(place.price.max)}`
        : "Giá liên hệ";
    const badgeLabel = selectedCategory && selectedCategory !== "Cafe" ? selectedCategory : place.category || "Khác";

    return `
        <div class="col-lg-4 col-md-6">
            <article class="restaurant-card">
                <div class="card-image-wrap">
                    <img src="${place.image || ""}" alt="${place.name || "restaurant"}">
                    <span class="card-badge">${badgeLabel}</span>
                </div>
                <div class="restaurant-info">
                    <div class="card-top">
                        <h5>${place.name || "Unnamed place"}</h5>
                        <span class="rating-pill">${ratingText}</span>
                    </div>
                    <div class="info-row">
                        <span>📍 ${districtText}</span>
                        <span>🕒 ${timeText}</span>
                    </div>
                    <div class="card-footer">
                        <span class="price">${priceText}</span>
                        <a class="card-action" href="detail.html?id=${place.id || ""}" data-place-id="${place.id || ""}" data-place-name="${place.name || "Một địa điểm"}">Xem chi tiết</a>
                    </div>
                </div>
            </article>
        </div>
    `;
}

function attachFeatureFilters() {
    const buttons = document.querySelectorAll("#feature-filters .filter-btn");

    buttons.forEach(button => {
        const feature = button.dataset.feature;

        button.addEventListener("click", () => {
            button.classList.toggle("active");
            if (selectedFeatures.includes(feature)) {
                selectedFeatures = selectedFeatures.filter(item => item !== feature);
            } else {
                selectedFeatures = [...selectedFeatures, feature];
            }
            applyFilters();
        });
    });
}

const categoryButtons = document.querySelectorAll(".main-category");

categoryButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        categoryButtons.forEach(item => item.classList.remove("active"));
        btn.classList.add("active");

        selectedCategory = getCategoryValue(btn);
        applyFilters();
    });
});

loadData();

const authTrigger = document.getElementById("auth-trigger");
const authDropdown = document.getElementById("authDropdown");
const authUserDropdown = document.getElementById("authUserDropdown");
const authCloseBtn = document.getElementById("auth-close-btn");
const authMessage = document.getElementById("auth-message");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const googleBtn = document.getElementById("google-signin");
const authTabs = document.querySelectorAll(".auth-tab");

function setAuthMessage(message, isError = false) {
    if (!authMessage) return;
    authMessage.textContent = message;
    authMessage.classList.toggle("error", isError);
}

function toggleAuthDropdown(show) {
    if (!authDropdown) return;
    authDropdown.classList.toggle("d-none", show === false);
    if (show === true) {
        authDropdown.classList.remove("d-none");
    }
}

function showSignedOutPanel() {
    const loggedInPanel = document.getElementById("auth-logged-in");
    const loginFormElement = document.getElementById("login-form");
    const registerFormElement = document.getElementById("register-form");
    const authTabsArray = Array.from(authTabs);
    const googleButton = document.getElementById("google-signin");

    if (!loggedInPanel || !loginFormElement || !registerFormElement) return;

    loggedInPanel.classList.add("d-none");
    loginFormElement.classList.remove("d-none");
    registerFormElement.classList.add("d-none");
    authTabsArray.forEach(tab => tab.classList.remove("d-none"));
    authTabsArray.forEach(item => item.classList.remove("active"));
    const defaultTab = authTabsArray.find(tab => tab.dataset.authTab === "login");
    if (defaultTab) defaultTab.classList.add("active");
    if (googleButton) googleButton.classList.remove("d-none");
    setAuthMessage("");
}

async function handleAuthButtonClick() {
    if (!authDropdown) return;

    if (auth.currentUser) {
        const isUserDropdownOpen = !authUserDropdown.classList.contains("d-none");
        if (isUserDropdownOpen) {
            authUserDropdown.classList.add("d-none");
        } else {
            authUserDropdown.classList.remove("d-none");
            authDropdown.classList.add("d-none");
        }
        return;
    }

    const isOpen = !authDropdown.classList.contains("d-none");
    const shouldOpen = !isOpen;
    if (shouldOpen) {
        showSignedOutPanel();
    }
    authUserDropdown?.classList.add("d-none");
    toggleAuthDropdown(shouldOpen);
}

function updateAuthPanel(user) {
    const loggedInPanel = document.getElementById("auth-logged-in");
    const loginFormElement = document.getElementById("login-form");
    const registerFormElement = document.getElementById("register-form");
    const authTabsArray = Array.from(authTabs);

    if (!loggedInPanel || !loginFormElement || !registerFormElement) return;

    const googleButton = document.getElementById("google-signin");

    if (user) {
        loggedInPanel.classList.remove("d-none");
        loginFormElement.classList.add("d-none");
        registerFormElement.classList.add("d-none");
        authTabsArray.forEach(tab => tab.classList.add("d-none"));
        if (googleButton) googleButton.classList.add("d-none");
        setAuthMessage(`Xin chào ${user.displayName || user.email}`);
    } else {
        showSignedOutPanel();
    }
}

function updateAuthButton(user) {
    if (!authTrigger) return;
    if (user) {
        authTrigger.innerHTML = `<span class="user-badge"><i class="bi bi-person-circle"></i>${user.displayName || user.email}</span>`;
    } else {
        authTrigger.innerHTML = `<i class="bi bi-box-arrow-in-right me-2"></i><span>Đăng nhập</span>`;
    }
}

auth.onAuthStateChanged((user) => {
    updateAuthButton(user);
    updateAuthPanel(user);
});

authTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        authTabs.forEach(item => item.classList.remove("active"));
        tab.classList.add("active");
        const mode = tab.dataset.authTab;
        loginForm?.classList.toggle("d-none", mode !== "login");
        registerForm?.classList.toggle("d-none", mode !== "register");
        setAuthMessage("");
    });
});

loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        toggleAuthDropdown(false);
    } catch (error) {
        setAuthMessage(error.message, true);
    }
});

registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;

    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        if (result.user) {
            await result.user.updateProfile({ displayName: name });
            toggleAuthDropdown(false);
        }
    } catch (error) {
        setAuthMessage(error.message, true);
    }
});

googleBtn?.addEventListener("click", async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
        toggleAuthDropdown(false);
    } catch (error) {
        setAuthMessage(error.message, true);
    }
});

const logoutBtn = document.getElementById("logout-btn");
logoutBtn?.addEventListener("click", async () => {
    try {
        await auth.signOut();
        toggleAuthDropdown(false);
        setAuthMessage("Đã đăng xuất");
    } catch (error) {
        setAuthMessage(error.message, true);
    }
});

authTrigger?.addEventListener("click", handleAuthButtonClick);
authCloseBtn?.addEventListener("click", () => toggleAuthDropdown(false));

const authUserLogoutBtn = document.getElementById("auth-user-logout");
authUserLogoutBtn?.addEventListener("click", async () => {
    try {
        await auth.signOut();
        authUserDropdown?.classList.add("d-none");
        toggleAuthDropdown(false);
    } catch (error) {
        setAuthMessage(error.message, true);
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && authDropdown && !authDropdown.classList.contains("d-none")) {
        toggleAuthDropdown(false);
    }
});

document.addEventListener("click", (event) => {
    if (!authDropdown || !authTrigger || !authUserDropdown) return;
    const target = event.target;
    if (!authDropdown.contains(target) && !authUserDropdown.contains(target) && !authTrigger.contains(target)) {
        authDropdown.classList.add("d-none");
        authUserDropdown.classList.add("d-none");
    }
});

const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");

function performSearch() {
    const query = searchInput.value.toLowerCase().trim();

    if (query) {
        saveActivity("search", "Tìm kiếm", query);
    }

    if (!query) {
        filteredRestaurants = [...restaurants];
        selectedCategory = null;
        selectedFeatures = [];
        document.querySelectorAll(".main-category").forEach(btn => btn.classList.remove("active"));
        document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
        showAllItems = false;
        renderRestaurants(filteredRestaurants);
        return;
    }

    filteredRestaurants = restaurants.filter(place =>
        place.name.toLowerCase().includes(query) ||
        place.address?.toLowerCase().includes(query) ||
        place.district?.toLowerCase().includes(query) ||
        place.tags?.some(tag => tag.toLowerCase().includes(query))
    );

    showAllItems = false;
    renderRestaurants(filteredRestaurants);
}

if (searchBtn) {
    searchBtn.addEventListener("click", performSearch);
}

if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            performSearch();
        }
    });
}