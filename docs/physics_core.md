# The Physics Core -- Fundamentos de Balistica Interior

> Documento fundacional para el simulador de balistica de precision enfocado en recarga de municion.
> Todas las ecuaciones en notacion LaTeX. Unidades SI salvo indicacion contraria.

---

## Indice

- [A. Termodinamica de la Combustion](#a-termodinamica-de-la-combustion)
- [B. Dinamica del Proyectil en el Canon](#b-dinamica-del-proyectil-en-el-canon)
- [C. Mecanica Estructural](#c-mecanica-estructural)
- [D. Armonicos del Canon](#d-armonicos-del-canon)
- [E. Modelo Integrado](#e-modelo-integrado)
- [F. Referencias Bibliograficas](#f-referencias-bibliograficas)

---

## A. Termodinamica de la Combustion

### A.1 Ecuacion de Estado Noble-Abel

La ecuacion de estado Noble-Abel modela el comportamiento de los gases de combustion del propelente a las altas densidades y temperaturas que se producen en el interior de un arma. Se obtiene de la ecuacion de Van der Waals eliminando el termino de atraccion intermolecular (a = 0), lo cual es razonable porque a altas temperaturas la energia cinetica domina sobre las fuerzas de atraccion.

**Ecuacion:**

$$
P \left( V - m_g \, \eta \right) = m_g \, \frac{R_u}{M_g} \, T
$$

O en forma especifica (por unidad de masa de gas):

$$
P \left( v - \eta \right) = \frac{R_u}{M_g} \, T
$$

Donde `v = V / m_g` es el volumen especifico.

**Forma alternativa usando la fuerza del propelente:**

$$
P = \frac{f \, \omega \, \psi}{V_{libre} - \omega \, \psi \, \eta}
$$

Donde el volumen libre es:

$$
V_{libre} = V_0 + A_b \, x - \frac{\omega}{\rho_p}(1 - \psi)
$$

| Variable | Descripcion | Unidades SI |
|----------|-------------|-------------|
| $P$ | Presion del gas | Pa |
| $V$ | Volumen total ocupado por el gas | m^3 |
| $m_g$ | Masa de gas producida | kg |
| $\eta$ | Covolumen (volumen propio de las moleculas de gas) | m^3/kg |
| $R_u$ | Constante universal de gases = 8.314 | J/(mol*K) |
| $M_g$ | Masa molar media de los gases de combustion | kg/mol |
| $T$ | Temperatura absoluta del gas | K |
| $f$ | Fuerza (impetu) del propelente = $R_u T_v / M_g$ | J/kg |
| $\omega$ | Masa total de carga de propelente | kg |
| $\psi$ | Fraccion de propelente quemada (0 a 1) | adimensional |
| $V_0$ | Volumen de la recamara | m^3 |
| $A_b$ | Area de la seccion transversal del anima | m^2 |
| $x$ | Desplazamiento del proyectil desde su posicion inicial | m |
| $\rho_p$ | Densidad del propelente solido | kg/m^3 |
| $v$ | Volumen especifico del gas | m^3/kg |

**Constantes y valores tipicos para propelentes de armas ligeras:**

| Parametro | Base simple (NC) | Base doble (NC+NG) | Base triple (NC+NG+NQ) |
|-----------|------------------|--------------------|------------------------|
| Fuerza $f$ | 900 -- 1050 kJ/kg | 1000 -- 1200 kJ/kg | 850 -- 1000 kJ/kg |
| Covolumen $\eta$ | 0.95 -- 1.10 dm^3/kg | 0.85 -- 1.05 dm^3/kg | 0.90 -- 1.10 dm^3/kg |
| $T_{llama}$ | 2500 -- 3100 K | 2800 -- 3500 K | 2400 -- 2800 K |
| $M_g$ | 22 -- 26 g/mol | 20 -- 25 g/mol | 20 -- 24 g/mol |
| $\gamma = c_p/c_v$ | 1.22 -- 1.26 | 1.20 -- 1.25 | 1.22 -- 1.26 |
| $\rho_p$ | 1550 -- 1650 kg/m^3 | 1550 -- 1650 kg/m^3 | 1550 -- 1650 kg/m^3 |

**Presion maxima en bomba manometrica (volumen constante, combustion completa):**

$$
P_m = \frac{f \, \Delta}{1 - \eta \, \Delta}
$$

Donde $\Delta = \omega / V_0$ es la densidad de carga (kg/m^3).

**Rango de validez:**
- Presiones hasta ~700 MPa (por encima, Van der Waals ofrece mejor precision).
- Temperaturas 1500 -- 4000 K.
- Densidades de gas donde $\rho_{gas} < 1/\eta$ (aprox. < 1000 kg/m^3).

**Termodinamica derivada (velocidad del sonido Noble-Abel):**

$$
a_s = \sqrt{ \gamma \, \frac{R_u}{M_g} \, T \, \left( \frac{v}{v - \eta} \right)^2 }
$$

**Ref:** Johnston, I.A. (2005). *The Noble-Abel Equation of State: Thermodynamic Derivations for Ballistics Modelling.* DSTO-TN-0670, Defence Science and Technology Organisation, Australia.

---

### A.2 Ley de Quemado de Vieille (Saint-Robert)

La ley de Vieille describe la velocidad de regresion lineal de la superficie del grano de propelente en funcion de la presion. Es la relacion fundamental que acopla la combustion con la presion en el sistema.

**Ecuacion:**

$$
r_b = \frac{de}{dt} = a_1 \, P^{\,n}
$$

Donde $e$ es la profundidad quemada del grano.

**Forma generalizada (de Saint-Robert):**

$$
r_b = u_0 + u_1 \, P^{\,n}
$$

En la practica, para la mayoria de propelentes de armas ligeras, $u_0 \approx 0$ y se usa la forma simplificada.

| Variable | Descripcion | Unidades SI |
|----------|-------------|-------------|
| $r_b$ | Velocidad de regresion lineal (tasa de quemado) | m/s |
| $e$ | Profundidad quemada del grano | m |
| $a_1$ | Coeficiente de tasa de quemado (empirico) | m/(s*Pa^n) |
| $n$ | Exponente de presion (empirico, adimensional) | -- |
| $P$ | Presion del gas | Pa |
| $u_0$ | Termino de velocidad base (generalmente ~0 para armas) | m/s |
| $u_1$ | Coeficiente de velocidad | m/(s*Pa^n) |

**Valores tipicos del exponente de presion:**

| Tipo de propelente | Rango de $n$ |
|--------------------|--------------|
| Base simple (NC) | 0.70 -- 0.95 |
| Base doble (NC+NG) | 0.75 -- 1.00 |
| Propelentes de cohete | 0.30 -- 0.60 |

> **Nota critica:** Los coeficientes $a_1$ y $n$ son puramente empiricos y se determinan mediante ensayos en vaso cerrado (closed vessel tests) o motores de prueba. NO pueden predecirse teoricamente.

**Efecto de la temperatura ambiente en la tasa de quemado:**

$$
a_1(T_{amb}) = a_1(T_{ref}) \, \exp\!\left[\sigma_p \,(T_{amb} - T_{ref})\right]
$$

| Variable | Descripcion | Unidades SI |
|----------|-------------|-------------|
| $\sigma_p$ | Coeficiente de sensibilidad termica | 1/K |
| $T_{ref}$ | Temperatura de referencia (tipicamente 294 K = 21 C) | K |
| $T_{amb}$ | Temperatura ambiente del propelente | K |

Valor tipico: $\sigma_p \approx 0.001 \text{ a } 0.004$ K^{-1}.

**Rango de validez:**
- Presiones: 10 MPa a 500 MPa para propelentes de armas.
- El exponente $n$ se ajusta sobre un rango de presiones especifico; extrapolar fuera de ese rango introduce error significativo.
- Para $n \geq 1$, la combustion es inestable (deflagracion a detonacion).

**Ref:** Vieille, P. (1893). *Etude sur le mode de combustion des substances explosives.* Memorial des Poudres et Salpetres, Vol. 6.

---

### A.3 Funcion de Forma del Grano (Form Function)

La fraccion volumetrica quemada $\psi$ depende de la geometria del grano de propelente. Se expresa como funcion de la profundidad de quemado normalizada $Z = e / e_1$ donde $e_1$ es la mitad del espesor del alma (web thickness / 2).

**Funcion de forma cuadratica:**

$$
\psi(Z) = (\theta + 1) \, Z - \theta \, Z^2
$$

Valida para $0 \leq Z \leq 1$ (fase de primera combustion, antes de que los granos se fragmenten).

| Variable | Descripcion | Unidades |
|----------|-------------|----------|
| $\psi$ | Fraccion volumetrica de propelente quemada | adimensional |
| $Z$ | Profundidad de quemado normalizada $= e / e_1$ | adimensional |
| $e_1$ | Mitad del espesor del alma del grano | m |
| $\theta$ | Factor de forma del grano | adimensional |

**Clasificacion por factor de forma:**

| Geometria del grano | $\theta$ | Comportamiento |
|---------------------|----------|----------------|
| Esfera / cilindro solido | $\theta > 0$ (+2/3 esfera, +1 cilindro) | Regresivo (superficie disminuye) |
| Lamina / tubo simple | $\theta = 0$ | Neutro (superficie constante) |
| Tubo multiperforado (7 perforaciones) | $\theta < 0$ (-0.1 a -0.9) | Progresivo (superficie aumenta) |

**Derivada temporal (para las ODEs del sistema):**

$$
\frac{d\psi}{dt} = \left[(\theta + 1) - 2\theta Z\right] \frac{1}{e_1} \, r_b
$$

Sustituyendo Vieille:

$$
\frac{d\psi}{dt} = \frac{a_1 \, P^n}{e_1} \left[(\theta + 1) - 2\theta Z\right]
$$

**Ref:** Corner, J. (1950). *Theory of the Interior Ballistics of Guns.* John Wiley & Sons, New York.

---

### A.4 Energia Liberada y Temperatura Adiabatica de Llama

**Energia total liberada por la combustion del propelente:**

$$
Q_{total} = \omega \, q_{exp}
$$

Donde $q_{exp}$ es el calor especifico de explosion (J/kg).

**Relacion entre la fuerza del propelente y la temperatura adiabatica de llama:**

$$
f = \frac{R_u \, T_v}{M_g} \qquad \Longrightarrow \qquad T_v = \frac{f \, M_g}{R_u}
$$

| Variable | Descripcion | Unidades SI |
|----------|-------------|-------------|
| $T_v$ | Temperatura adiabatica de llama isocora (volumen constante) | K |
| $q_{exp}$ | Calor especifico de explosion | J/kg |
| $f$ | Fuerza / impetu del propelente | J/kg |

**Relacion entre calor de explosion y fuerza:**

$$
f = (\gamma - 1) \, q_{exp}
$$

Donde $\gamma = c_p / c_v$ es la razon de calores especificos de los gases de combustion.

**Balance de energia en la recamara (primera ley de la termodinamica):**

$$
\omega \, \psi \, f = P \left( V_{libre} - \omega \, \psi \, \eta \right) \cdot \frac{1}{(\gamma - 1)} + \frac{1}{2} m_{ef} v^2 + Q_{perdidas}
$$

Donde:

$$
m_{ef} = m + \frac{\omega}{3}
$$

es la masa efectiva del proyectil (incluyendo la inercia del gas segun Lagrange).

| Variable | Descripcion | Unidades SI |
|----------|-------------|-------------|
| $m$ | Masa del proyectil | kg |
| $m_{ef}$ | Masa efectiva (proyectil + 1/3 masa de gas) | kg |
| $v$ | Velocidad del proyectil | m/s |
| $Q_{perdidas}$ | Perdidas termicas a las paredes del canon | J |

**Valores tipicos de calor de explosion:**

| Propelente | $q_{exp}$ (kJ/kg) |
|------------|-------------------|
| Base simple (NC 13.2% N) | 3200 -- 3800 |
| Base doble (NC + NG 40%) | 4000 -- 5000 |
| Base triple (NC + NG + NQ) | 3000 -- 3600 |

**Ref:** AMCP 706-150. (1965). *Engineering Design Handbook: Interior Ballistics of Guns.* U.S. Army Materiel Command.

---

## B. Dinamica del Proyectil en el Canon

### B.1 Modelo de Lagrange (Gradiente de Presion)

El modelo de Lagrange es la aproximacion clasica para tratar el gradiente de presion en la columna de gas entre la culata y la base del proyectil. Asume que la densidad del gas (incluyendo particulas de propelente no quemado) es uniforme en todo el espacio, y que la velocidad del gas varia linealmente desde cero en la culata hasta la velocidad del proyectil en su base.

**Presion en una posicion relativa $z$ (0 = culata, 1 = base del proyectil):**

$$
\frac{P(z)}{P_s} = 1 + \frac{\omega}{2m}(1 - z^2)
$$

**Presion de culata (breech):**

$$
P_b = P_s \left(1 + \frac{\omega}{2m}\right)
$$

**Presion media espacial:**

$$
\bar{P} = P_s \left(1 + \frac{\omega}{3m}\right)
$$

| Variable | Descripcion | Unidades SI |
|----------|-------------|-------------|
| $P(z)$ | Presion en posicion relativa $z$ | Pa |
| $P_s$ | Presion en la base del proyectil (shot base) | Pa |
| $P_b$ | Presion en la culata (breech) | Pa |
| $\bar{P}$ | Presion media espacial | Pa |
| $z$ | Posicion relativa (0 = culata, 1 = base) | adimensional |
| $\omega$ | Masa de la carga de propelente | kg |
| $m$ | Masa del proyectil | kg |

**Relacion entre presion media y presion base:**

$$
P_s = \frac{\bar{P}}{1 + \omega/(3m)}
$$

**Nota:** Para municion de armas ligeras, la razon $\omega / m$ tipicamente varia entre 0.3 y 1.2. Para ratios altos (> 1.0), la aproximacion de Lagrange pierde precision y se debe usar el modelo de Pidduck-Kent.

**Rango de validez:**
- Razon $\omega / m < 1.5$ (idealmente < 1.0).
- Asume velocidad del sonido infinita en el gas (cuasi-estacionario).
- No considera variaciones de seccion transversal (hombro vs. anima).

**Ref:** Corner, J. (1950). *Theory of the Interior Ballistics of Guns.* John Wiley & Sons. Cap. 4.

---

### B.2 Ecuacion de Movimiento del Proyectil

**Segunda ley de Newton aplicada al proyectil:**

$$
m_{ef} \, \frac{dv}{dt} = P_s \, A_b - F_{engrave} - F_{friction} - F_{resist}
$$

O equivalentemente:

$$
m_{ef} \, v \, \frac{dv}{dx} = P_s \, A_b - F_{engrave} - F_{friction} - F_{resist}
$$

Donde la masa efectiva incluye la inercia del gas de Lagrange:

$$
m_{ef} = m + C_1 \, \omega
$$

Con $C_1 = 1/3$ para el gradiente de Lagrange, o $C_1 \approx 0.36 - 0.40$ para correcciones de Pidduck-Kent.

| Variable | Descripcion | Unidades SI |
|----------|-------------|-------------|
| $v$ | Velocidad del proyectil | m/s |
| $x$ | Desplazamiento del proyectil | m |
| $P_s$ | Presion en la base del proyectil | Pa |
| $A_b$ | Area de la seccion transversal del anima | m^2 |
| $F_{engrave}$ | Fuerza de grabado (engraving) del estriado | N |
| $F_{friction}$ | Fuerza de friccion en el anima | N |
| $F_{resist}$ | Fuerza resistiva adicional (presion atmosferica, etc.) | N |
| $m_{ef}$ | Masa efectiva del sistema | kg |

**Ref:** Carlucci, D.E. & Jacobson, S.S. (2007). *Ballistics: Theory and Design of Guns and Ammunition.* CRC Press. Cap. 3.

---

### B.3 Presion de Engrave (Inicio del Movimiento)

La presion de engrave es la presion minima necesaria para que el proyectil comience a moverse, deformando la camisa de cobre/laton contra las estrias del canon.

**Modelo simplificado de la fuerza de engrave:**

$$
F_{engrave} = \sigma_y \, A_{engrave} \, (1 + \mu \, \cot\alpha)
$$

Donde:

$$
A_{engrave} = \pi \, d \, h_{land} \, N_{lands} \, w_{land}
$$

Pero en la practica se usa una presion de arranque empirica:

$$
P_{start} = \frac{F_{engrave}}{A_b}
$$

| Variable | Descripcion | Unidades SI |
|----------|-------------|-------------|
| $P_{start}$ | Presion de arranque / engrave | Pa |
| $\sigma_y$ | Limite elastico del material de la camisa (Cu, gilding metal) | Pa |
| $A_{engrave}$ | Area efectiva de contacto en el grabado | m^2 |
| $d$ | Diametro del anima | m |
| $h_{land}$ | Altura de las estrias (land height) | m |
| $N_{lands}$ | Numero de estrias | -- |
| $w_{land}$ | Ancho de las estrias | m |
| $\mu$ | Coeficiente de friccion estatico Cu/acero | -- |
| $\alpha$ | Angulo de la entrada del estriado (lead-in angle) | rad |

**Valores tipicos de presion de engrave:**

| Tipo de proyectil | $P_{start}$ aproximada |
|-------------------|------------------------|
| Proyectil con camisa Cu, nucleo Pb | 20 -- 35 MPa |
| Proyectil monolitico Cu solido | 70 -- 120 MPa |
| Proyectil con camisa fina, freebore largo | 5 -- 15 MPa |

> **Nota para el simulador:** La presion de engrave define la condicion inicial del movimiento. Antes de alcanzar $P_{start}$, el proyectil esta estacionario ($v = 0$, $x = 0$). Esto es critico para la prediccion de la curva de presion-tiempo.

**Ref:** Carlucci, D.E. & Jacobson, S.S. (2007). *Ballistics: Theory and Design of Guns and Ammunition.* CRC Press; DTIC ADA431357: *Rifling Profile Push Tests.*

---

### B.4 Friccion Canon-Proyectil

La fuerza de friccion entre el proyectil y el anima del canon se descompone en dos componentes: axial (resistencia al avance) y tangencial (resistencia al giro por el rayado).

**Fuerza de friccion axial:**

$$
F_{friction,x} = \mu_k \, P_s \, A_{contact}
$$

**Fuerza de friccion tangencial (debida al rayado):**

$$
F_{friction,y} = \mu_k \, N \, \frac{\pi d}{L_{twist}}
$$

Donde $N$ es la fuerza normal del proyectil contra las estrias.

**Modelo simplificado combinado (Hatcher):**

$$
F_{friction} = \mu_k \, P_s \, \pi \, d \, L_{contact} \left(1 + \frac{\pi d}{L_{twist}}\right)^{-1} \approx \mu_k \, P_s \, \pi \, d \, L_{contact}
$$

La contribucion de la friccion a la energia total es aproximadamente un 3--7% de la energia quimica del propelente.

| Variable | Descripcion | Unidades SI |
|----------|-------------|-------------|
| $F_{friction,x}$ | Fuerza de friccion axial | N |
| $F_{friction,y}$ | Fuerza de friccion tangencial | N |
| $\mu_k$ | Coeficiente de friccion cinetica | adimensional |
| $A_{contact}$ | Area de contacto proyectil-anima | m^2 |
| $d$ | Diametro del anima (calibre) | m |
| $L_{contact}$ | Longitud de contacto del proyectil con el anima | m |
| $L_{twist}$ | Paso de estria (distancia para una vuelta completa) | m |

**Coeficientes de friccion tipicos:**

| Par de materiales | $\mu_k$ |
|-------------------|---------|
| Cu-jacket / Acero cromado (con lubricante de gas) | 0.02 -- 0.05 |
| Cu-jacket / Acero 4150 (sin tratamiento) | 0.05 -- 0.10 |
| Pb (plomo) / Acero | 0.10 -- 0.20 |
| Recubrimiento MoS2 / Acero | 0.01 -- 0.03 |

**Modelo de friccion como porcentaje de la presion base (simplificacion para lumped-parameter):**

$$
P_{friction} = k_f \, P_s
$$

Donde $k_f \approx 0.02 - 0.10$ (tipicamente ~0.05 para armas ligeras).

**Ref:** Hatcher, J.S. (1947). *Hatcher's Notebook.* Stackpole Books; DTIC: *Measuring Barrel Friction in the 5.56mm NATO.*

---

### B.5 Aceleracion y Velocidad en Boca

**Sistema de ecuaciones diferenciales ordinarias (ODEs) del modelo lumped-parameter:**

El sistema completo a resolver en el tiempo es:

**1. Tasa de quemado (progreso de la combustion):**

$$
\frac{dZ}{dt} = \frac{a_1 \, P^n}{e_1}
$$

**2. Fraccion quemada:**

$$
\psi(Z) = (\theta + 1) Z - \theta Z^2 \quad \text{para } 0 \leq Z \leq 1
$$

**3. Ecuacion de estado (presion media, algebraica):**

$$
\bar{P} = \frac{f \, \omega \, \psi}{V_0 + A_b x - \omega(1 - \psi)/\rho_p - \omega \psi \eta}
$$

**4. Presion en la base del proyectil:**

$$
P_s = \frac{\bar{P}}{1 + \omega / (3m)}
$$

**5. Ecuacion de movimiento:**

$$
\frac{dv}{dt} = \frac{P_s \, A_b - F_{friction}}{m + \omega/3}
$$

**6. Desplazamiento:**

$$
\frac{dx}{dt} = v
$$

**Condiciones iniciales (t = 0):**

$$
Z(0) = 0, \quad \psi(0) = 0, \quad v(0) = 0, \quad x(0) = 0
$$

**Condicion de arranque:** $P \geq P_{start}$ para que $dv/dt > 0$.

**Condicion de fin:** $x = L_{barrel} - L_{chamber}$ (el proyectil alcanza la boca).

**Metodo numerico recomendado:** Runge-Kutta de 4o orden (RK4) con paso adaptativo, o Dormand-Prince (RK45).

**Velocidad en boca:**

$$
v_{muzzle} = v(t_{exit})
$$

**Energia cinetica en boca:**

$$
E_k = \frac{1}{2} m \, v_{muzzle}^2
$$

**Eficiencia termodinamica del sistema:**

$$
\eta_{thermo} = \frac{E_k}{\omega \, q_{exp}}
$$

Valores tipicos de eficiencia: 25--35% para rifles, 15--25% para pistolas.

**Ref:** AMCP 706-150 (1965); Corner (1950); Carlucci & Jacobson (2007).

---

## C. Mecanica Estructural

### C.1 Deformacion de la Vaina (Expansion Radial y Retroceso Elastico)

La vaina de laton (70Cu-30Zn) actua como sello de gas (obturador) al expandirse radialmente contra las paredes de la recamara bajo la presion interna. Al cesar la presion, el laton retrocede elasticamente, permitiendo la extraccion.

**Modelo de cilindro de pared gruesa (ecuaciones de Lame):**

**Tension circunferencial (hoop stress):**

$$
\sigma_{\theta}(r) = \frac{P_i \, r_i^2 - P_o \, r_o^2}{r_o^2 - r_i^2} + \frac{(P_i - P_o) \, r_i^2 \, r_o^2}{(r_o^2 - r_i^2) \, r^2}
$$

Para la vaina (sin presion externa, $P_o = 0$):

$$
\sigma_{\theta}(r) = \frac{P_i \, r_i^2}{r_o^2 - r_i^2} \left(1 + \frac{r_o^2}{r^2}\right)
$$

**Tension radial:**

$$
\sigma_r(r) = \frac{P_i \, r_i^2}{r_o^2 - r_i^2} \left(1 - \frac{r_o^2}{r^2}\right)
$$

**Desplazamiento radial (expansion):**

$$
u_r(r) = \frac{P_i \, r_i^2}{E \, (r_o^2 - r_i^2)} \left[(1 - \nu) \, r + (1 + \nu) \, \frac{r_o^2}{r}\right]
$$

**Expansion diametral de la superficie exterior:**

$$
\Delta d_{ext} = 2 \, u_r(r_o) = \frac{2 \, P_i \, r_i^2 \, r_o}{E \, (r_o^2 - r_i^2)} \cdot 2
$$

Simplificado:

$$
\Delta d_{ext} = \frac{4 \, P_i \, r_i^2 \, r_o}{E \, (r_o^2 - r_i^2)}
$$

| Variable | Descripcion | Unidades SI |
|----------|-------------|-------------|
| $P_i$ | Presion interna (presion de la recamara) | Pa |
| $P_o$ | Presion externa (= presion atmosferica ~ 0) | Pa |
| $r_i$ | Radio interior de la vaina | m |
| $r_o$ | Radio exterior de la vaina | m |
| $r$ | Radio de evaluacion | m |
| $\sigma_\theta$ | Tension circunferencial (hoop) | Pa |
| $\sigma_r$ | Tension radial | Pa |
| $u_r$ | Desplazamiento radial | m |
| $E$ | Modulo de Young del laton | Pa |
| $\nu$ | Coeficiente de Poisson del laton | adimensional |

**Propiedades mecanicas del laton de cartucho (C26000, 70/30):**

| Propiedad | Recocido (soft) | Endurecido (hard, 1/4H - H) |
|-----------|-----------------|------------------------------|
| $\sigma_y$ (limite elastico) | 100 -- 150 MPa | 430 -- 530 MPa |
| $\sigma_{UTS}$ (resistencia ultima) | 300 -- 350 MPa | 525 -- 600 MPa |
| $E$ (modulo de Young) | 110 GPa | 110 GPa |
| $\nu$ (Poisson) | 0.33 | 0.33 |
| Elongacion a rotura | 60 -- 68% | 3 -- 8% |

**Condicion de fluencia (deformacion plastica permanente):**

$$
\sigma_\theta(r_i) \geq \sigma_y \quad \Longrightarrow \quad P_i \geq \sigma_y \, \frac{r_o^2 - r_i^2}{r_o^2 + r_i^2}
$$

**Retroceso elastico (springback):**

La fraccion de deformacion que se recupera depende de la relacion entre la deformacion elastica y la total:

$$
\epsilon_{elastic} = \frac{\sigma_\theta}{E}
$$

$$
\Delta d_{springback} = \Delta d_{total} - \Delta d_{plastic}
$$

En la practica, la vaina se expande hasta contactar la recamara, luego:
- La zona del cuerpo (pared delgada, laton recocido) sufre deformacion plastica significativa.
- La zona del culote (pared gruesa, laton endurecido por trabajo) permanece mayormente elastica.
- El springback tipico permite una reduccion diametral de 0.02 -- 0.10 mm para la extraccion.

**Separacion de culote (case head separation):**

La separacion ocurre en la zona de transicion entre el culote (grueso) y el cuerpo (delgado), donde el estiramiento axial acumulativo adelgaza la pared. El criterio de fallo:

$$
t_{wall}(N_{reloads}) < t_{critico}
$$

Donde $t_{wall}$ disminuye con cada ciclo de disparo-resizing debido a:
1. Estiramiento axial por headspace excesivo.
2. Trabajo en frio acumulativo (fatiga de bajo ciclo).
3. Perdida de ductilidad por endurecimiento.

**Ref:** Shigley, J.E. (2011). *Mechanical Engineering Design.* McGraw-Hill; ScienceDirect: *Theoretical and numerical investigations on the headspace of cartridge cases.*

---

### C.2 Erosion del Canon (Mecanismo Termoquimico)

La erosion del canon es el desgaste progresivo del anima, predominantemente en la zona del origen de las estrias (forcing cone), causado por la combinacion de ataque termico y quimico de los gases de combustion.

**Ecuacion de Lawton (tipo Arrhenius):**

$$
W = E_r \, \sqrt{t_{exp}} \, \exp\!\left(-\frac{E_a}{R_u \, T_{surf,max}}\right)
$$

| Variable | Descripcion | Unidades SI |
|----------|-------------|-------------|
| $W$ | Desgaste por disparo (profundidad de material perdido) | m/disparo |
| $E_r$ | Erosividad del propelente (constante empirica) | m/s^{1/2} |
| $t_{exp}$ | Tiempo de exposicion a gases calientes | s |
| $E_a$ | Energia de activacion del proceso de difusion | J/mol |
| $R_u$ | Constante universal de gases = 8.314 | J/(mol*K) |
| $T_{surf,max}$ | Temperatura maxima de la superficie del anima | K |

**Valores tipicos:**

| Parametro | Valor tipico |
|-----------|-------------|
| $E_r$ (erosividad media) | ~80 m/s^{1/2} |
| $E_a$ (energia de activacion) | ~69 MJ/kg-mol = 69,000 J/mol |
| $T_{surf,max}$ (canon sin cromo) | 1200 -- 1800 K |
| $T_{surf,max}$ (canon cromado) | 800 -- 1400 K |

**Temperatura superficial (solucion de conduccion de calor semi-infinita):**

$$
T_{surf}(t) = T_0 + \frac{2 \, q_s \, \sqrt{t}}{\sqrt{\pi \, k_s \, \rho_s \, c_s}}
$$

| Variable | Descripcion | Unidades SI |
|----------|-------------|-------------|
| $T_0$ | Temperatura inicial del canon | K |
| $q_s$ | Flujo de calor en la superficie | W/m^2 |
| $k_s$ | Conductividad termica del acero | W/(m*K) |
| $\rho_s$ | Densidad del acero | kg/m^3 |
| $c_s$ | Calor especifico del acero | J/(kg*K) |

**Propiedades del acero 4150 (tipico de canones de armas ligeras):**

| Propiedad | Valor |
|-----------|-------|
| $k_s$ | 42.7 W/(m*K) |
| $\rho_s$ | 7850 kg/m^3 |
| $c_s$ | 475 J/(kg*K) |

### C.3 Vida Util del Canon

La vida util se estima como el numero de disparos hasta que la erosion acumulada alcanza un criterio de degradacion (tipicamente duplicacion del diametro del anima en el origen de las estrias o caida de velocidad > 30 m/s):

$$
N_{life} = \frac{W_{crit}}{\bar{W}}
$$

Donde $\bar{W}$ es el desgaste medio por disparo y $W_{crit}$ la profundidad de erosion critica.

**Factores que reducen la vida del canon:**

| Factor | Efecto en erosion |
|--------|-------------------|
| Mayor $T_{llama}$ del propelente | Exponencialmente peor (Arrhenius) |
| Mayor volumen de gas (cargas pesadas) | Mas tiempo de exposicion |
| Cadencia de tiro alta | No permite enfriamiento entre disparos |
| Canon sin revestimiento de cromo | 2 -- 5x mas erosion |

**Vida tipica estimada (armas ligeras):**

| Calibre / Tipo | Vida tipica (disparos) |
|----------------|----------------------|
| .22 LR | > 50,000 |
| .223 Rem / 5.56 NATO | 10,000 -- 20,000 |
| .308 Win / 7.62 NATO | 8,000 -- 15,000 |
| .300 Win Mag | 3,000 -- 5,000 |
| .338 Lapua Mag | 2,500 -- 4,000 |
| .50 BMG | 5,000 -- 10,000 |

**Ref:** Lawton, B. (2001). *Thermo-chemical erosion in gun barrels.* Wear, 251(1-12), 827-838; Johnston, I.A. (2005). *Understanding and Predicting Gun Barrel Erosion.* DSTO-TR-1757.

---

## D. Armonicos del Canon

### D.1 Modos de Vibracion (Teoria de Viga Euler-Bernoulli)

El canon de un rifle se modela como una viga en voladizo (empotrada en la recamara / accion, libre en la boca). Las vibraciones transversales se excitan por el impulso del disparo y el paso del proyectil.

**Ecuacion diferencial de vibracion libre (Euler-Bernoulli):**

$$
E I \, \frac{\partial^4 w}{\partial x^4} + \rho A \, \frac{\partial^2 w}{\partial t^2} = 0
$$

| Variable | Descripcion | Unidades SI |
|----------|-------------|-------------|
| $w(x,t)$ | Deflexion transversal del canon | m |
| $E$ | Modulo de Young del acero | Pa |
| $I$ | Momento de inercia de la seccion transversal | m^4 |
| $\rho$ | Densidad del material del canon | kg/m^3 |
| $A$ | Area de la seccion transversal | m^2 |
| $x$ | Posicion a lo largo del canon | m |
| $t$ | Tiempo | s |

**Para un canon de seccion variable (conico), $I$ y $A$ son funciones de $x$.**

**Frecuencias naturales de una viga en voladizo uniforme:**

$$
f_n = \frac{\lambda_n^2}{2 \pi L^2} \sqrt{\frac{E I}{\rho A}}
$$

Donde $\lambda_n$ son los autovalores del modo $n$:

| Modo ($n$) | $\lambda_n$ | Descripcion |
|------------|-------------|-------------|
| 1 | 1.8751 | Primer modo fundamental |
| 2 | 4.6941 | Segundo modo |
| 3 | 7.8548 | Tercer modo |
| 4 | 10.996 | Cuarto modo |
| $n > 4$ | $(2n-1)\pi/2$ | Aproximacion asintotica |

**Momento de inercia para un tubo (canon):**

$$
I = \frac{\pi}{64} \left( D_o^4 - D_i^4 \right)
$$

| Variable | Descripcion | Unidades SI |
|----------|-------------|-------------|
| $L$ | Longitud libre del canon (desde la accion) | m |
| $D_o$ | Diametro exterior del canon | m |
| $D_i$ | Diametro interior (calibre + 2 * profundidad de estrias) | m |
| $f_n$ | Frecuencia natural del modo $n$ | Hz |

**Valores de referencia (rifle tipico con canon de 22", acero 416 SS):**

| Parametro | Valor |
|-----------|-------|
| $E$ (acero 416 SS) | 200 GPa |
| $\rho$ (acero 416 SS) | 7800 kg/m^3 |
| Velocidad del sonido en el acero | ~4540 m/s (longitudinal) |
| Modo 1 frecuencia tipica | 65 -- 130 Hz |
| Modo 2 frecuencia tipica | 340 -- 500 Hz |
| Modo 3 frecuencia tipica | 900 -- 1200 Hz |

**Ref:** Rao, S.S. (2007). *Vibration of Continuous Systems.* Wiley; Varmintal.com: *Rifle Barrel Tuner Vibration Analysis.*

---

### D.2 Efecto en la Dispersion del Grupo

La posicion y velocidad angular de la boca del canon en el instante de salida del proyectil determinan el angulo de salida, que es la principal fuente de dispersion inducida por armonicos.

**Angulo de salida (muzzle exit angle):**

$$
\alpha_{exit} = \left. \frac{\partial w}{\partial x} \right|_{x = L, \, t = t_{exit}}
$$

**Deflexion de la boca:**

$$
\delta_{muzzle} = w(L, t_{exit})
$$

**Velocidad transversal de la boca:**

$$
\dot{w}_{muzzle} = \left. \frac{\partial w}{\partial t} \right|_{x = L, \, t = t_{exit}}
$$

La variacion en $\alpha_{exit}$ de disparo a disparo (debida a variaciones en el tiempo de transito del proyectil) causa dispersion vertical en el blanco:

$$
\Delta_{vertical} = R \cdot \Delta\alpha_{exit}
$$

Donde $R$ es la distancia al blanco.

**Variacion del tiempo de transito en boca:**

$$
\Delta t_{exit} = t_{exit} \, \frac{\Delta v_{muzzle}}{v_{muzzle}} \approx \frac{L_{bore}}{v_{muzzle}^2} \, \Delta v_{muzzle}
$$

Para un rifle .308 Win a 100 m:
- $\Delta v_{muzzle}$ = 10 m/s (SD ~ 10 m/s, carga inconsistente)
- $t_{exit} \approx$ 1.1 ms
- Cambio en angulo del Modo 2 (~400 Hz): $\Delta\alpha \approx 2\pi \times 400 \times \Delta t_{exit} \times \alpha_{max}$

---

### D.3 Metodo OCW (Optimal Charge Weight)

El metodo OCW busca una carga de propelente cuya velocidad en boca coincida con un nodo (punto de inflexion) de la vibracion de la boca, de modo que pequenas variaciones en la carga no cambien significativamente el angulo de salida.

**Principio fisico:**

En un nodo de la vibracion, $\partial w / \partial t \approx 0$ y la derivada del angulo de salida respecto al tiempo es minima:

$$
\left. \frac{\partial}{\partial t} \left( \frac{\partial w}{\partial x} \right) \right|_{nodo} \approx 0
$$

Esto significa que pequenas variaciones en $t_{exit}$ (debidas a variaciones en la carga) producen cambios minimos en $\alpha_{exit}$.

**Procedimiento OCW (Dan Newberry):**

1. Preparar grupos de 3 cartuchos a incrementos de carga equiespaciados (tipicamente 0.3 -- 0.5 grains).
2. Disparar todos los grupos al mismo blanco, notando el punto de impacto medio (POI) de cada grupo.
3. Identificar la "meseta OCW": rango de cargas donde el POI es practicamente identico (variacion < 0.5 MOA).
4. Seleccionar la carga central de la meseta como OCW.

**Condicion matematica del OCW:**

$$
\frac{\partial \, POI}{\partial \, \omega_{charge}} \approx 0
$$

Es equivalente a encontrar un punto estacionario en la relacion carga-POI.

**Relacion con el Optimal Barrel Time (OBT) de Chris Long:**

$$
t_{OBT,k} = \frac{(2k - 1)}{4 f_{n}} \quad \text{para } k = 1, 2, 3, \ldots
$$

Donde $f_n$ es la frecuencia del modo dominante (tipicamente Modo 2) y $k$ selecciona nodos sucesivos (picos o valles de la onda).

**Ref:** Newberry, D. (2003). *Optimal Charge Weight Load Development Method;* Long, C.E. (2003). *Optimal Barrel Time Paper;* Varmintal.com.

---

## E. Modelo Integrado

### E.1 Diagrama de Flujo del Calculo Completo

```
INICIO
  |
  v
[INPUTS DEL USUARIO]
  |
  v
[FASE 0: Inicializacion]
  - Calcular V_0, A_b, densidad de carga Delta
  - Inicializar Z=0, psi=0, v=0, x=0, t=0
  |
  v
[FASE 1: Ignicion / Pre-movimiento]  (x = 0, v = 0)
  - Resolver Noble-Abel + Vieille para P(t)
  - Loop temporal hasta P >= P_start
  |
  v
[FASE 2: Aceleracion en el canon]  (0 < x < L_bore)
  - Resolver sistema de ODEs (RK4 / RK45):
      dZ/dt = a1 * P^n / e1
      psi   = (theta+1)*Z - theta*Z^2
      P_avg = f*omega*psi / (V_libre - omega*psi*eta)
      P_s   = P_avg / (1 + omega/(3m))
      dv/dt = (P_s*A_b - F_friction) / (m + omega/3)
      dx/dt = v
  - Verificar: P_b < P_max_admisible (seguridad)
  - Registrar P(t), v(t), x(t)
  |
  v
[Z >= 1? Combustion completa]
  - SI: Expansion adiabatica de los gases (gamma)
  - NO: Continuar con quemado
  |
  v
[x >= L_bore? Proyectil en boca]
  - SI: Registrar v_muzzle, P_muzzle, t_exit
  - NO: Continuar integracion temporal
  |
  v
[FASE 3: Post-proceso]
  - Calcular P_breech(t) = P_s * (1 + omega/(2m))
  - Calcular energia cinetica, eficiencia
  - Estimar deformacion de la vaina (Lame)
  - Estimar erosion del canon (Lawton)
  - Calcular armonicos (Euler-Bernoulli)
  - Evaluar angulo de salida vs nodos OCW
  |
  v
[OUTPUTS]
  |
  v
FIN
```

### E.2 Inputs Necesarios del Usuario

#### Datos del Cartucho / Recamara

| Input | Simbolo | Unidades | Ejemplo (.308 Win) |
|-------|---------|----------|---------------------|
| Volumen de recamara (water capacity) | $V_0$ | cm^3 -> m^3 | 3.64 cm^3 |
| Longitud del canon (hasta la boca) | $L_{barrel}$ | mm -> m | 610 mm (24") |
| Longitud de la recamara | $L_{chamber}$ | mm -> m | ~51 mm |
| Calibre (diametro del anima) | $d$ | mm -> m | 7.82 mm |
| Numero de estrias | $N_{lands}$ | -- | 4 o 6 |
| Paso de estria | $L_{twist}$ | mm -> m | 305 mm (1:12") |
| Diametro exterior del canon (en boca) | $D_{o,muzzle}$ | mm -> m | 20.3 mm |
| Diametro exterior del canon (en recamara) | $D_{o,breech}$ | mm -> m | 34.0 mm |
| Freebore (distancia al estriado) | $l_{free}$ | mm -> m | variable |

#### Datos del Proyectil

| Input | Simbolo | Unidades | Ejemplo |
|-------|---------|----------|---------|
| Masa del proyectil | $m$ | grains -> kg | 168 gr = 10.886 g |
| Diametro del proyectil | $d_{proj}$ | mm | 7.82 mm |
| Material de la camisa | -- | -- | Gilding metal (Cu 95%, Zn 5%) |
| Presion de engrave estimada | $P_{start}$ | MPa | 25 MPa |

#### Datos del Propelente

| Input | Simbolo | Unidades | Ejemplo (Varget-like) |
|-------|---------|----------|----------------------|
| Masa de la carga | $\omega$ | grains -> kg | 44.0 gr = 2.851 g |
| Fuerza del propelente | $f$ | J/kg | 1,000,000 J/kg |
| Covolumen | $\eta$ | m^3/kg | 0.001 m^3/kg (1.0 dm^3/kg) |
| Exponente de presion | $n$ | -- | 0.85 |
| Coeficiente de quemado | $a_1$ | m/(s*Pa^n) | (calibrado) |
| Espesor del alma (web) | $2 e_1$ | mm -> m | 0.4 mm |
| Factor de forma | $\theta$ | -- | -0.2 (progresivo) |
| Ratio calores especificos | $\gamma$ | -- | 1.24 |
| Densidad del solido | $\rho_p$ | kg/m^3 | 1600 |
| Temp. adiabatica de llama | $T_v$ | K | 2900 |

#### Datos de la Vaina

| Input | Simbolo | Unidades | Ejemplo |
|-------|---------|----------|---------|
| Material | -- | -- | C26000 (70/30 brass) |
| Diametro interior (cuello) | $d_{i,neck}$ | mm | 7.62 mm |
| Diametro exterior (cuello) | $d_{o,neck}$ | mm | 8.72 mm |
| Espesor pared cuerpo | $t_{body}$ | mm | 0.38 mm |
| Numero de recargas previas | $N_{reloads}$ | -- | 0-10 |

### E.3 Outputs del Simulador

#### Outputs Primarios

| Output | Simbolo | Unidades | Descripcion |
|--------|---------|----------|-------------|
| Presion maxima de recamara | $P_{max}$ | MPa | Presion pico en la culata |
| Velocidad en boca | $v_{muzzle}$ | m/s | Velocidad del proyectil al salir |
| Tiempo de transito | $t_{exit}$ | ms | Tiempo desde ignicion hasta salida |
| Tiempo hasta presion pico | $t_{Pmax}$ | ms | Instante de maxima presion |
| Presion en boca | $P_{muzzle}$ | MPa | Presion residual cuando el proyectil sale |

#### Outputs de Seguridad

| Output | Descripcion | Criterio |
|--------|-------------|----------|
| Ratio presion SAAMI/CIP | $P_{max} / P_{max,spec}$ | Debe ser < 1.0 |
| Presion de culata maxima | $P_b$ vs limite de la accion | Debe ser < limite |
| Tension hoop en la vaina | $\sigma_\theta$ vs $\sigma_y$ del laton | Margen de seguridad |

#### Outputs de Rendimiento / Optimizacion

| Output | Descripcion |
|--------|-------------|
| Curva $P(t)$ completa | Presion vs tiempo |
| Curva $P(x)$ | Presion vs posicion del proyectil |
| Curva $v(x)$ | Velocidad vs posicion |
| Eficiencia termodinamica $\eta$ | Porcentaje de energia quimica convertida |
| Fraccion quemada al salir $\psi(t_{exit})$ | Indica si la carga quema completa en el canon |
| Erosion estimada por disparo | $W$ (micrometros/disparo) |
| Expansion de la vaina | $\Delta d_{ext}$ en zonas criticas |
| Tiempo de nodo OCW | Tiempos optimos de salida para baja dispersion |
| Angulo de salida $\alpha_{exit}$ | Contribucion a la dispersion |

#### Outputs de Diagnostico

| Output | Descripcion |
|--------|-------------|
| Equilibrio de energia | Distribucion: cinetica, termica gas, perdidas paredes, friccion |
| Sensibilidad $\partial v / \partial \omega$ | Variacion de velocidad por variacion de carga (0.1 gr) |
| Sensibilidad $\partial P / \partial \omega$ | Variacion de presion por variacion de carga |
| Vida estimada del canon | Disparos hasta degradacion critica |

---

## F. Referencias Bibliograficas

### Fuentes Primarias (Libros de Texto)

1. **Corner, J.** (1950). *Theory of the Interior Ballistics of Guns.* John Wiley & Sons, New York.
   - Referencia clasica para toda la teoria del modelo lumped-parameter.

2. **Carlucci, D.E. & Jacobson, S.S.** (2007). *Ballistics: Theory and Design of Guns and Ammunition.* CRC Press.
   - Texto moderno que cubre balistica interior, exterior y terminal con derivaciones completas.

3. **AMCP 706-150** (1965). *Engineering Design Handbook: Interior Ballistics of Guns.* U.S. Army Materiel Command.
   - Manual de diseno militar con datos empiricos extensos de propelentes y geometrias.

4. **Rao, S.S.** (2007). *Vibration of Continuous Systems.* John Wiley & Sons.
   - Teoria de vibraciones de vigas (Euler-Bernoulli y Timoshenko).

5. **Shigley, J.E.** (2011). *Mechanical Engineering Design.* 9th ed. McGraw-Hill.
   - Cilindros de pared gruesa, ecuaciones de Lame, fatiga de materiales.

### Fuentes Primarias (Articulos y Reportes Tecnicos)

6. **Johnston, I.A.** (2005). *The Noble-Abel Equation of State: Thermodynamic Derivations for Ballistics Modelling.* DSTO-TN-0670, Defence Science and Technology Organisation, Australia.

7. **Johnston, I.A.** (2005). *Understanding and Predicting Gun Barrel Erosion.* DSTO-TR-1757, Defence Science and Technology Organisation, Australia.

8. **Lawton, B.** (2001). *Thermo-chemical erosion in gun barrels.* Wear, 251(1-12), 827-838.

9. **Vieille, P.** (1893). *Etude sur le mode de combustion des substances explosives.* Memorial des Poudres et Salpetres, Vol. 6.

10. **Hatcher, J.S.** (1947). *Hatcher's Notebook.* Stackpole Books.

11. **Robbins, F.W. & Anderson, R.D.** (1990). *New Pressure Gradient Equations for Lumped-Parameter Interior Ballistic Codes.* BRL-TR-3140, DTIC ADA222590.

12. **DST Group** (2017). *Development of a Fast Lumped Parameter Interior Ballistic Model.* DST-Group-TN-1655, Australia.

### Fuentes Practicas (Recarga / OCW)

13. **Newberry, D.** (2003). *Optimal Charge Weight Load Development Method.*

14. **Long, C.E.** (2003). *Optimal Barrel Time Paper.*

15. **Vaughn, H.** (1998). *Rifle Accuracy Facts.* Precision Shooting Inc.

### Fuentes Web Tecnicas Consultadas

16. Modelling of internal ballistics of gun systems: A review. *Defence Technology* (2024). ScienceDirect.

17. *Interior Ballistics Symbols and Terminology.* The Meandering of a Ballistics Oriented Mind (2025). tmoabom.blog.

18. *Rifle Barrel Tuner Vibration Analysis.* Varmintal.com.

19. *Measuring Barrel Friction in the 5.56mm NATO.* ResearchGate.

20. *DTIC ADA431357: Rifling Profile Push Tests.* Defence Technical Information Center.

---

> **Nota final:** Este documento contiene las ecuaciones fundamentales necesarias para implementar el simulador. Los coeficientes empiricos ($a_1$, $n$, $P_{start}$, $\mu_k$) deben calibrarse con datos experimentales (reloading manuals, datos de presion por transductor, cronografo). Las ecuaciones han sido verificadas contra las fuentes citadas. Para el simulador, se recomienda implementar primero el sistema ODE basico (Seccion B.5) y luego anadir los modulos de mecanica estructural y armonicos como post-proceso.
