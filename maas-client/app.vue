<template>
  <div>
    <NuxtLoadingIndicator :throttle="2" color="#d97757" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <BaseToast />
  </div>
</template>
