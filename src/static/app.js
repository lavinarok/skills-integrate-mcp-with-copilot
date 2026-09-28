document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const registrationDialog = document.getElementById("registration-dialog");
  const selectedActivity = document.getElementById("selected-activity");
  const emailInput = document.getElementById("email");
  const themeToggle = document.getElementById("theme-toggle");
  const searchInput = document.getElementById("search");
  const categorySelect = document.getElementById("category");
  const sortSelect = document.getElementById("sort");
  let allActivities = {};
  let activityForRegistration = "";

  function setTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark-mode", isDark);
    themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
    themeToggle.setAttribute("aria-pressed", String(isDark));
    localStorage.setItem("mergington-theme", theme);
  }

  function openRegistration(activityName) {
    activityForRegistration = activityName;
    selectedActivity.textContent = activityName;
    messageDiv.className = "hidden";
    signupForm.reset();
    registrationDialog.showModal();
    emailInput.focus();
  }

  function closeRegistration() {
    registrationDialog.close();
    activityForRegistration = "";
  }

  function renderActivities() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedCategory = categorySelect.value;
    const sortBy = sortSelect.value;

    const filteredActivities = Object.entries(allActivities)
      .filter(([name, details]) => {
        const searchableText = `${name} ${details.description}`.toLowerCase();
        const matchesSearch = searchableText.includes(searchTerm);
        const matchesCategory =
          selectedCategory === "all" || details.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort(([firstName, firstDetails], [secondName, secondDetails]) => {
        if (sortBy === "schedule") {
          return firstDetails.schedule_order - secondDetails.schedule_order;
        }
        return firstName.localeCompare(secondName);
      });

    activitiesList.innerHTML = "";

    if (filteredActivities.length === 0) {
      activitiesList.innerHTML = "<p>No activities match your filters.</p>";
      return;
    }

    filteredActivities.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;
      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">Remove</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p class="activity-category">${details.category}</p>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <button type="button" class="register-btn" data-activity="${name}">
          Register student
        </button>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);
    });

    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
    document.querySelectorAll(".register-btn").forEach((button) => {
      button.addEventListener("click", () => openRegistration(button.dataset.activity));
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      allActivities = activities;

      const categories = [
        ...new Set(Object.values(activities).map((activity) => activity.category)),
      ].sort();
      categorySelect.innerHTML = '<option value="all">All categories</option>';
      categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
      });

      renderActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle registration from the activity card dialog
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value;
    const activity = activityForRegistration;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
        setTimeout(closeRegistration, 700);
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  searchInput.addEventListener("input", renderActivities);
  categorySelect.addEventListener("change", renderActivities);
  sortSelect.addEventListener("change", renderActivities);
  document.getElementById("close-dialog").addEventListener("click", closeRegistration);
  document.getElementById("cancel-registration").addEventListener("click", closeRegistration);
  registrationDialog.addEventListener("click", (event) => {
    if (event.target === registrationDialog) closeRegistration();
  });
  themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
    setTheme(nextTheme);
  });

  setTheme(localStorage.getItem("mergington-theme") || "light");

  // Initialize app
  fetchActivities();
});
