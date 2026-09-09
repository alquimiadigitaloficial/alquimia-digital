// api/delivery.js

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas."
  );
}

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);


// ========================================
// CONFIGURAÇÕES
// ========================================

// Tempo durante o qual o link ficará disponível.
// 30 minutos.
const LINK_EXPIRATION_SECONDS = 60 * 30;


// ========================================
// FUNÇÃO PRINCIPAL
// ========================================

export default async function handler(req, res) {

  // Permitir apenas GET
  if (req.method !== "GET") {

    return res.status(405).json({
      success: false,
      error: "Método não permitido."
    });

  }


  try {

    // ========================================
    // OBTER TOKEN
    // ========================================

    const token =
      req.query?.token;


    if (!token || typeof token !== "string") {

      return res.status(400).json({
        success: false,
        error: "Token de entrega não informado."
      });

    }


    // ========================================
    // PROCURAR PEDIDO
    // ========================================

    const {
      data: order,
      error: orderError
    } =
      await supabaseAdmin
        .from("orders")
        .select(`
          id,
          product,
          customer_name,
          customer_email,
          quantity,
          total,
          status,
          delivery_token,
          delivery_expires_at
        `)
        .eq("delivery_token", token)
        .maybeSingle();


    if (orderError) {

      console.error(
        "Erro ao procurar pedido:",
        orderError
      );

      return res.status(500).json({
        success: false,
        error: "Não foi possível verificar o pedido."
      });

    }


    if (!order) {

      return res.status(404).json({
        success: false,
        error: "Link de entrega inválido ou inexistente."
      });

    }


    // ========================================
    // VERIFICAR PAGAMENTO
    // ========================================

    if (order.status !== "paid") {

      return res.status(403).json({
        success: false,
        error: "O pagamento deste pedido ainda não foi confirmado."
      });

    }


    // ========================================
    // VERIFICAR EXPIRAÇÃO
    // ========================================

    if (order.delivery_expires_at) {

      const expiration =
        new Date(order.delivery_expires_at);

      const now =
        new Date();


      if (now >= expiration) {

        return res.status(410).json({
          success: false,
          error: "Este link de entrega expirou."
        });

      }

    }


    // ========================================
    // VERIFICAR PRODUTO
    // ========================================

    if (!order.product) {

      return res.status(400).json({
        success: false,
        error: "Este pedido não possui um produto associado."
      });

    }


    const {
      data: product,
      error: productError
    } =
      await supabaseAdmin
        .from("products")
        .select(`
          id,
          name,
          product_url
        `)
        .eq("id", order.product)
        .maybeSingle();


    if (productError) {

      console.error(
        "Erro ao procurar produto:",
        productError
      );

      return res.status(500).json({
        success: false,
        error: "Não foi possível localizar o produto."
      });

    }


    if (!product) {

      return res.status(404).json({
        success: false,
        error: "Produto não encontrado."
      });

    }


    // ========================================
    // VERIFICAR FICHEIRO
    // ========================================

    if (!product.product_url) {

      return res.status(404).json({
        success: false,
        error: "Este produto ainda não possui um ficheiro para entrega."
      });

    }


    // ========================================
    // LIMPAR CAMINHO
    // ========================================

    let filePath =
      product.product_url;


    // Se tiver sido guardado como:
    // produtos/nome.pdf
    //
    // retiramos "produtos/" porque
    // já estamos dentro do bucket "produtos".

    if (
      filePath.startsWith("produtos/")
    ) {

      filePath =
        filePath.substring(
          "produtos/".length
        );

    }


    // ========================================
    // CRIAR LINK TEMPORÁRIO
    // ========================================

    const {
      data: signedUrlData,
      error: signedUrlError
    } =
      await supabaseAdmin
        .storage
        .from("produtos")
        .createSignedUrl(
          filePath,
          LINK_EXPIRATION_SECONDS
        );


    if (signedUrlError) {

      console.error(
        "Erro ao criar link:",
        signedUrlError
      );

      return res.status(500).json({
        success: false,
        error: "Não foi possível gerar o acesso ao ficheiro."
      });

    }


    if (!signedUrlData?.signedUrl) {

      return res.status(500).json({
        success: false,
        error: "O link temporário não foi criado."
      });

    }


    // ========================================
    // REDIRECIONAR PARA O PDF
    // ========================================

    return res.redirect(
      302,
      signedUrlData.signedUrl
    );


  } catch (error) {

    console.error(
      "Erro inesperado:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor."
    });

  }

}
