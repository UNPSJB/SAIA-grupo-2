class ErrorCode:
    PLAN_NO_ENCONTRADO = "El plan no fue encontrado."
    TITULO_DUPLICADO = "Plan ya existe."
    FECHAS_INVALIDAS = "La fecha de fin no puede ser anterior a la fecha de inicio."
    EQUIPO_DANADO = "No se puede asignar al plan un equipo en estado danado."
    SIN_EQUIPOS = "El plan debe tener al menos un equipo asociado."
    SIN_TAREAS = "El plan debe tener al menos una tarea asociada."
    PLAN_CON_TAREAS = "No se puede eliminar: el plan tiene tareas asociadas."
