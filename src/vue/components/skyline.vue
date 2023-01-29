<template>
  <div id="skyline-layout">
    <div id="week-layout">
      <p class="skyline-label">Mon</p>
      <p class="skyline-label">Wed</p>
      <p
        class="skyline-label"
        data-tooltip="Tooltip help here!"
        data-flow="top"
      >
        Fri
      </p>
    </div>
    <div id="month-layout">
      <p class="skyline-label" id="month-label-0"></p>
      <p class="skyline-label" id="month-label-1"></p>
      <p class="skyline-label" id="month-label-2"></p>
      <p class="skyline-label" id="month-label-3"></p>
      <p class="skyline-label" id="month-label-4"></p>
      <p class="skyline-label" id="month-label-5"></p>
      <p class="skyline-label" id="month-label-6"></p>
      <p class="skyline-label" id="month-label-7"></p>
      <p class="skyline-label" id="month-label-8"></p>
      <p class="skyline-label" id="month-label-9"></p>
      <p class="skyline-label" id="month-label-10"></p>
      <p class="skyline-label" id="month-label-11"></p>
      <p class="skyline-label" id="month-label-12"></p>
    </div>
    <div>
      <div v-for="week in 51" style="float: left">
        <div v-for="day in 7" :id="`week-${week}-day-${day}`" class="day-block">
          ({{ week }}-{{ day }})
        </div>
      </div>
    </div>
  </div>
  <TTooltip content="这是Tooltip内容" showArrow>
    <button>666</button>
  </TTooltip>
</template>

<script setup lang="ts">
import { Tooltip as TTooltip } from "tdesign-vue-next";
</script>

<style scoped>
.day-block {
  border-radius: 20%;
  transition: all 0.6s;
}

.day-block:hover {
  box-shadow: 0 0 6px gold;
  cursor: pointer;
}

#week-layout {
  display: block;
  position: absolute;
  width: 36px;
  top: 20px;
  left: 0;
}

#week-layout > p {
  display: block;
  text-align: right;
  margin: 9px 0 0;
}

.skyline-label {
  font-size: 12px;
  color: #ffffff;
  text-overflow: ellipsis;
}

#month-layout {
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  position: absolute;
  left: 36px;
  top: 0;
  width: 642px;
}

#month-layout > p {
  display: block;
  margin: 0;
}
</style>
