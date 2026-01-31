/**
 * Interactive Product Showcase
 * Handles clickable product dots and popup functionality
 */

const InteractiveShowcase = (function () {
    let showcaseProducts = [];

    /**
     * Initialize the showcase
     */
    async function init() {
        console.log("Initializing Interactive Product Showcase...");

        // Set up sample products (now async)
        await setupSampleProducts();

        // Set up event listeners
        setupEventListeners();

        console.log("Interactive Product Showcase initialized");
    }

    /**
     * Load showcase products from API by produc
     *
     * t IDs
     */
    async function setupSampleProducts() {
        console.log("Loading showcase products from API...");

        const showcaseProductIds = ["FEA-002", "NEW-003", "FEA-005"];

        // Dot classes for positioning on the image
        const dotClasses = ["dot-necklace", "dot-earrings", "dot-bangle"];

        try {
            // Load all products from all categories
            const categories = [
                "new-arrivals",
                "featured-collection",
                "saree-collection",
            ];
            const allProducts = [];

            for (const category of categories) {
                const response = await fetch(
                    `/.netlify/functions/load-products?category=${category}`,
                );
                const data = await response.json();

                if (data.success && data.products) {
                    allProducts.push(...data.products);
                }
            }

            console.log(
                "Loaded",
                allProducts.length,
                "total products from API",
            );

            // Find the showcase products by ID
            showcaseProducts = showcaseProductIds
                .map((productId, index) => {
                    const product = allProducts.find((p) => p.id === productId);

                    if (product) {
                        return {
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            originalPrice: product.originalPrice || null,
                            image: product.image || product.mainImage,
                            description: product.description || product.name,
                            dotClass: dotClasses[index],
                            stock: product.stock,
                        };
                    } else {
                        console.warn("Product not found:", productId);
                        return null;
                    }
                })
                .filter((p) => p !== null);

            console.log("Found", showcaseProducts.length, "showcase products");

            // Render product list
            renderProductList();
        } catch (error) {
            console.error("Error loading showcase products:", error);

            // Fallback to empty array
            showcaseProducts = [];
            renderProductList();
        }
    }

    /**
     * Render the product list in the showcase
     */
    function renderProductList() {
        const productList = document.querySelector(".showcase-product-list");
        if (!productList) return;

        const productsHTML = showcaseProducts
            .map((product) => {
                const formattedPrice = new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    minimumFractionDigits: 0,
                }).format(product.price);

                const originalPriceHTML = product.originalPrice
                    ? `<span class="showcase-product-original-price">${new Intl.NumberFormat(
                          "en-IN",
                          {
                              style: "currency",
                              currency: "INR",
                              minimumFractionDigits: 0,
                          },
                      ).format(product.originalPrice)}</span>`
                    : "";

                return `
                <div class="showcase-product-item" data-product-id="${product.id}">
                    <img src="${product.image}" alt="${product.name}" class="showcase-product-thumb">
                    <div class="showcase-product-info">
                        <div class="showcase-product-name">${product.name}</div>
                        <div class="showcase-product-price">${formattedPrice} ${originalPriceHTML}</div>
                    </div>
                </div>
            `;
            })
            .join("");

        productList.innerHTML = productsHTML;
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Product dot clicks
        document.querySelectorAll(".product-dot").forEach((dot) => {
            dot.addEventListener("click", handleDotClick);
        });

        // Product item clicks
        document.querySelectorAll(".showcase-product-item").forEach((item) => {
            item.addEventListener("click", handleProductItemClick);
        });

        // Close popup
        const closeBtn = document.querySelector(".popup-close-btn");
        if (closeBtn) {
            closeBtn.addEventListener("click", closePopup);
        }

        // Close popup on overlay click
        const modal = document.querySelector(".product-popup-modal");
        if (modal) {
            modal.addEventListener("click", function (e) {
                if (e.target === modal) {
                    closePopup();
                }
            });
        }

        // Add to bag button
        const addToBagBtn = document.querySelector(".add-set-to-bag-btn");
        if (addToBagBtn) {
            addToBagBtn.addEventListener("click", handleAddSetToBag);
        }
    }

    /**
     * Handle dot click
     */
    function handleDotClick(e) {
        const dotClass = Array.from(e.currentTarget.classList).find((c) =>
            c.startsWith("dot-"),
        );
        const product = showcaseProducts.find((p) => p.dotClass === dotClass);

        if (product) {
            showProductPopup(product);
        }
    }

    /**
     * Handle product item click
     */
    function handleProductItemClick(e) {
        const productId = e.currentTarget.dataset.productId;
        const product = showcaseProducts.find((p) => p.id === productId);

        if (product) {
            showProductPopup(product);
        }
    }

    /**
     * Show product popup
     */
    function showProductPopup(product) {
        const modal = document.querySelector(".product-popup-modal");
        if (!modal) return;

        const formattedPrice = new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 0,
        }).format(product.price);

        // Update popup content
        modal.querySelector(".popup-product-image").src = product.image;
        modal.querySelector(".popup-product-name").textContent = product.name;
        modal.querySelector(".popup-product-price").textContent =
            formattedPrice;
        modal.querySelector(".popup-product-description").textContent =
            product.description;

        // Set up popup buttons
        const addToCartBtn = modal.querySelector(".popup-add-to-cart-btn");
        const viewDetailsBtn = modal.querySelector(".popup-view-details-btn");

        addToCartBtn.onclick = () => handleAddToCart(product);
        viewDetailsBtn.onclick = () =>
            (window.location.href = `product-detail.html?id=${product.id}`);

        // Show modal
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    /**
     * Close popup
     */
    function closePopup() {
        const modal = document.querySelector(".product-popup-modal");
        if (modal) {
            modal.classList.remove("active");
            document.body.style.overflow = "";
        }
    }

    /**
     * Handle add to cart
     */
    function handleAddToCart(product) {
        if (typeof CartManager !== "undefined") {
            // Add to cart
            CartManager.addToCart(
                {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                },
                1,
            );

            // Show success message
            showToast("Product added to cart!", "success");

            // Close popup first
            closePopup();

            // CartManager.addToCart already opens the cart automatically
        } else {
            console.error("CartManager not available");
            showToast("Unable to add to cart", "error");
        }
    }

    /**
     * Handle add set to bag
     */
    async function handleAddSetToBag() {
        if (typeof CartManager !== "undefined") {
            try {
                // Add each product to the cart using CartManager.addToCart
                for (const product of showcaseProducts) {
                    await CartManager.addToCart(
                        {
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            image: product.image,
                        },
                        1,
                    );
                }

                // Show toast notification
                showToast(
                    `Complete set (${showcaseProducts.length} items) added to cart!`,
                    "success",
                );
            } catch (error) {
                console.error("Error adding set to cart:", error);
                showToast("Unable to add set to cart", "error");
            }
        } else {
            console.error("CartManager not available");
            showToast("Unable to add set to cart", "error");
        }
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = "success") {
        let toastContainer = document.querySelector(".toast-container");
        if (!toastContainer) {
            toastContainer = document.createElement("div");
            toastContainer.className = "toast-container";
            toastContainer.style.cssText =
                "position: fixed; bottom: 20px; right: 20px; z-index: 9999;";
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.style.cssText = `
            padding: 12px 20px;
            color: white;
            border-radius: 4px;
            margin-bottom: 10px;
            min-width: 250px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            background-color: ${type === "success" ? "#4CAF50" : "#F44336"};
        `;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Public API
    return {
        init,
    };
})();

// Initialize immediately - script is at end of body so DOM is loaded
InteractiveShowcase.init();
