package app.podlist.domain

object ListSelection {
    fun allSelected(order: List<String>, selected: Set<String>): Boolean = order.isNotEmpty() && selected.containsAll(order)
    fun toggleAll(order: List<String>, selected: Set<String>): Set<String> =
        if (allSelected(order, selected)) emptySet() else order.toSet()
}
