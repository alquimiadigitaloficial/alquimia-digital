// ========================================
// ALQUIMIA DIGITAL - JAVASCRIPT
// ========================================

document.addEventListener("DOMContentLoaded", function () {

    // Mensagem no console
    console.log("Alquimia Digital carregada com sucesso!");

    // Seleciona todos os links do menu
    const menuLinks = document.querySelectorAll(".menu a");

    // Adiciona um efeito ao clicar nos links
    menuLinks.forEach(function (link) {

        link.addEventListener("click", function () {

            console.log("Navegando para: " + link.textContent);

        });

    });

});