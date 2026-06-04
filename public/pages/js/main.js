(function ($) {
    "use strict";

    /**
     * 1. PRELOADER (Transición de Fútbol a Logo Equilibrado)
     * Maneja la desaparición de la cancha y el escalado del logo
     */
    $(window).on('load', function () {
        var preloader = $('#preloader');
        var cancha = $('.cancha-mini');
        var loadingLogo = $('.loading-logo-container');

        if (preloader.length) {
            // Sincronización al segundo 1.0 (momento del gol)
            setTimeout(function() {
                // Ocultamos el arco y la pelota suavemente
                cancha.addClass('ocultar-cancha');
                
                // Aparece el logo en el centro
                loadingLogo.addClass('show-gol');
            }, 1000); 

            // Desvanecimiento final para entrar a la web
            setTimeout(function () {
                preloader.css('opacity', '0');
                
                setTimeout(function () {
                    preloader.css('display', 'none');
                }, 500);
            }, 3800); 
        }
    });

    $(document).ready(function () {
        /**
         * 2. Dropdown on mouse hover
         */
        function toggleNavbarMethod() {
            if ($(window).width() > 992) {
                $('.navbar .dropdown').on('mouseover', function () {
                    $('.dropdown-toggle', this).trigger('click');
                }).on('mouseout', function () {
                    $('.dropdown-toggle', this).trigger('click').blur();
                });
            } else {
                $('.navbar .dropdown').off('mouseover').off('mouseout');
            }
        }
        toggleNavbarMethod();
        $(window).resize(toggleNavbarMethod);

        /**
         * 3. Back to top button
         */
        $(window).scroll(function () {
            if ($(this).scrollTop() > 100) {
                $('.back-to-top').fadeIn('slow');
            } else {
                $('.back-to-top').fadeOut('slow');
            }
        });

        $('.back-to-top').click(function () {
            $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
            return false;
        });

        /**
         * 4. Carousels (Vendor & Related)
         */
        if ($.fn.owlCarousel) {
            $('.vendor-carousel').owlCarousel({
                loop: true,
                margin: 29,
                nav: false,
                autoplay: true,
                smartSpeed: 1000,
                responsive: {
                    0: { items: 2 },
                    576: { items: 3 },
                    768: { items: 4 },
                    992: { items: 5 },
                    1200: { items: 6 }
                }
            });

            $('.related-carousel').owlCarousel({
                loop: true,
                margin: 29,
                nav: false,
                autoplay: true,
                smartSpeed: 1000,
                responsive: {
                    0: { items: 1 },
                    576: { items: 2 },
                    768: { items: 3 },
                    992: { items: 4 }
                }
            });
        }

        /**
         * 5. Product Quantity Buttons
         */
        $('.quantity button').on('click', function () {
            var button = $(this);
            var input = button.parent().parent().find('input');
            var oldValue = parseFloat(input.val());
            var newVal;

            if (button.hasClass('btn-plus')) {
                newVal = oldValue + 1;
            } else {
                newVal = (oldValue > 0) ? oldValue - 1 : 0;
            }
            input.val(newVal);
        });
    });
    document.getElementById('btn-editar').addEventListener('click', function() {
    // 1. Seleccionamos todos los inputs y les quitamos el 'readonly' para poder escribir
    const inputs = document.querySelectorAll('.editable-input');
    inputs.forEach(input => {
        input.removeAttribute('readonly');
        input.classList.add('is-valid'); // Opcional: le da un toque visual de Bootstrap
    });

    // 2. Mostramos todos los iconos de lápiz (quitando la clase 'd-none' de Bootstrap)
    const iconos = document.querySelectorAll('.edit-icon');
    iconos.forEach(icono => {
        icono.classList.remove('d-none');
    });

    // 3. Ocultamos el botón "Editar" y mostramos el de "Guardar Cambios"
    this.classList.add('d-none');
    document.getElementById('btn-guardar').classList.remove('d-none');
    });

        // Evento cuando el usuario envía/guarda el formulario
        document.getElementById('form-perfil').addEventListener('submit', function(e) {
        e.preventDefault(); // Evita que la página se recargue locamente
    
    alert("¡Cambios guardados con éxito!");
    
    // Aquí podés volver a poner los inputs en 'readonly' y ocultar los lápices si querés que vuelva al estado inicial
    location.reload(); // O simplemente recargás para simular que impactó en tu sistema
    });
})(jQuery);
