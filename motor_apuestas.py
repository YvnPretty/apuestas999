import heapq
import time

class Orden:
    def __init__(self, usuario_id, tipo, lado, precio, cantidad):
        self.id = id(self)
        self.usuario_id = usuario_id
        self.tipo = tipo        # 'COMPRA' (Limit Order)
        self.lado = lado        # 'SI' o 'NO'
        self.precio = precio    # Entre 0.01 y 0.99
        self.cantidad = cantidad
        self.timestamp = time.time()

    def __lt__(self, other):
        if self.tipo == 'COMPRA':
            return self.precio > other.precio 
        return self.precio < other.precio

class LibroDeOrdenes:
    def __init__(self):
        self.compras_si = []  
        self.ventas_si = []   
        self.historial_tratos = []
        self.usuarios = {} # {usuario_id: {'saldo': float, 'posicion': int, 'costo_promedio': float}}

    def registrar_usuario(self, usuario_id, saldo_inicial=1000.0):
        if usuario_id not in self.usuarios:
            self.usuarios[usuario_id] = {
                'saldo': saldo_inicial,
                'posicion': 0, # Acciones del "SI"
                'costo_promedio': 0.0
            }

    def agregar_orden(self, orden):
        self.registrar_usuario(orden.usuario_id)
        print(f"\n[ORDEN] {orden.usuario_id} -> {orden.tipo} {orden.lado} | Cant: {orden.cantidad} | Precio: ${orden.precio:.2f}")
        
        if orden.tipo == 'COMPRA' and orden.lado == 'SI':
            self.procesar_compra_si(orden)
        elif orden.tipo == 'VENTA' and orden.lado == 'SI':
            self.procesar_venta_si(orden)
            
    def procesar_compra_si(self, orden_compra):
        while orden_compra.cantidad > 0 and self.ventas_si:
            mejor_venta = self.ventas_si[0]
            if orden_compra.precio < mejor_venta.precio:
                break
                
            cantidad_trato = min(orden_compra.cantidad, mejor_venta.cantidad)
            precio_ejecucion = mejor_venta.precio
            
            self.ejecutar_match(orden_compra.usuario_id, mejor_venta.usuario_id, cantidad_trato, precio_ejecucion)
            
            orden_compra.cantidad -= cantidad_trato
            mejor_venta.cantidad -= cantidad_trato
            
            if mejor_venta.cantidad == 0:
                heapq.heappop(self.ventas_si)
                
        if orden_compra.cantidad > 0:
            heapq.heappush(self.compras_si, orden_compra)

    def procesar_venta_si(self, orden_venta):
        while orden_venta.cantidad > 0 and self.compras_si:
            mejor_compra = self.compras_si[0]
            if orden_venta.precio > mejor_compra.precio:
                break
            
            cantidad_trato = min(orden_venta.cantidad, mejor_compra.cantidad)
            precio_ejecucion = mejor_compra.precio 
            
            self.ejecutar_match(mejor_compra.usuario_id, orden_venta.usuario_id, cantidad_trato, precio_ejecucion)
            
            orden_venta.cantidad -= cantidad_trato
            mejor_compra.cantidad -= cantidad_trato
            
            if mejor_compra.cantidad == 0:
                heapq.heappop(self.compras_si)
                
        if orden_venta.cantidad > 0:
            heapq.heappush(self.ventas_si, orden_venta)

    def ejecutar_match(self, comprador_id, vendedor_id, cantidad, precio):
        costo_total = cantidad * precio
        
        # Actualizar Comprador
        self.usuarios[comprador_id]['saldo'] -= costo_total
        self.usuarios[comprador_id]['posicion'] += cantidad
        
        # Actualizar Vendedor
        self.usuarios[vendedor_id]['saldo'] += costo_total
        self.usuarios[vendedor_id]['posicion'] -= cantidad # Short selling o venta de posicion
        
        self.historial_tratos.append({
            'comprador': comprador_id,
            'vendedor': vendedor_id,
            'cantidad': cantidad,
            'precio': precio,
            'timestamp': time.time()
        })
        
        print(f"   ✅ MATCH: {cantidad} acciones @ ${precio:.2f} ({comprador_id} compra a {vendedor_id})")

    def resolver_mercado(self, resultado):
        """
        resultado: 1.0 si el evento ocurrió (SI gana), 0.0 si no ocurrió (NO gana).
        """
        print(f"\n--- RESOLUCIÓN DEL MERCADO: {'SÍ OCURRIÓ' if resultado == 1.0 else 'NO OCURRIÓ'} ---")
        for user_id, data in self.usuarios.items():
            posicion = data['posicion']
            pago = posicion * resultado
            data['saldo'] += pago
            data['posicion'] = 0
            print(f"User {user_id:10} | Posición final: {posicion:4} | Pago: ${pago:7.2f} | Saldo Final: ${data['saldo']:8.2f}")

# --- SIMULACIÓN ---

mercado = LibroDeOrdenes()

# Registro inicial
mercado.registrar_usuario("Cartman", 100.0)
mercado.registrar_usuario("Stan", 100.0)
mercado.registrar_usuario("Kenny", 100.0)
mercado.registrar_usuario("Butters", 100.0)

print("MERCADO ABIERTO: ¿Kyle iniciará una guerra?")
print("Saldos iniciales: $100.00 para todos.")

# 1. Cartman vende 50 acciones a $0.60 (Cree que NO pasará)
mercado.agregar_orden(Orden("Cartman", "VENTA", "SI", 0.60, 50))

# 2. Stan quiere comprar 30 a $0.40 (No hay match)
mercado.agregar_orden(Orden("Stan", "COMPRA", "SI", 0.40, 30))

# 3. Kenny compra 20 a $0.65 (Match con Cartman a $0.60)
mercado.agregar_orden(Orden("Kenny", "COMPRA", "SI", 0.65, 20))

# 4. Butters vende 10 a $0.35 (Match con Stan a $0.40)
mercado.agregar_orden(Orden("Butters", "VENTA", "SI", 0.35, 10))

# 5. Kyle (nuevo) compra el resto de lo que vende Cartman
mercado.registrar_usuario("Kyle", 100.0)
mercado.agregar_orden(Orden("Kyle", "COMPRA", "SI", 0.60, 30))

# RESOLUCIÓN: Supongamos que Kyle SÍ inicia la guerra (Resultado = 1.0)
mercado.resolver_mercado(1.0)
