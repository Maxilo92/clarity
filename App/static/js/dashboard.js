// Navigation Interactivity
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
    });
});

// App Config & Version Management
async function loadAppInfo() {
    try {
        const resp = await fetch("/api/config");
        const config = await resp.json();
        if (config.app_version) {
            const versionStr = "v" + config.app_version;
            
            // Header version (if exists)
            const versionEl = document.getElementById("app-version");
            if (versionEl) {
                versionEl.textContent = versionStr;
                versionEl.style.display = "inline-block"; // Ensure visibility
            }
            
            // Footer versions (all occurrences)
            document.querySelectorAll(".footer-version").forEach(el => {
                el.textContent = "(" + versionStr + ")";
                el.style.opacity = "0.7";
                el.style.fontSize = "0.85em";
                el.style.marginLeft = "5px";
                el.style.display = "inline"; // Ensure visibility
            });
            
            console.log("Clarity Version loaded: " + versionStr);
        }
    } catch (e) {
        console.error("Could not load app info", e);
    }
}

// Run immediately and on DOMContentLoaded to be sure
loadAppInfo();
document.addEventListener("DOMContentLoaded", loadAppInfo);
